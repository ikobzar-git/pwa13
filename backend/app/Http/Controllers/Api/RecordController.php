<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Client\RequestException;
use App\Models\User;
use App\Services\YclientsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class RecordController extends Controller
{
    public function __construct(
        protected YclientsService $yclients
    ) {}

    public function slots(Request $request)
    {
        $request->validate([
            'company_id' => 'required|string',
            'staff_id' => 'required|integer',
            'date' => 'required|date',
        ]);

        $companyId = $request->company_id;
        $staffId = (int) $request->staff_id;
        $date = $request->date;

        try {
            if ($staffId === 0) {
                return response()->json($this->slotsForAnyMaster($companyId, $date));
            }

            $slots = $this->yclients->getBookTimes($companyId, $staffId, $date);
            return response()->json($slots);
        } catch (\Throwable $e) {
            Log::warning('Yclients slots failed', ['error' => $e->getMessage()]);
            return response()->json([]);
        }
    }

    protected function slotsForAnyMaster(string $companyId, string $date): array
    {
        $staffList = $this->yclients->getStaff($companyId);
        $merged = [];

        foreach ($staffList as $staff) {
            $staffId = $staff['id'] ?? null;
            if (! $staffId) continue;

            try {
                $slots = $this->yclients->getBookTimes($companyId, (int) $staffId, $date);
                foreach ($slots as $slot) {
                    $time = $slot['time'] ?? $slot['datetime'] ?? null;
                    if ($time && ! isset($merged[$time])) {
                        $merged[$time] = $slot;
                    }
                }
            } catch (\Throwable $e) {
                continue;
            }
        }

        ksort($merged);
        return array_values($merged);
    }

    public function dateAvailability(Request $request)
    {
        $request->validate([
            'company_id' => 'required|string',
            'staff_id' => 'required|integer',
            'month' => 'required|date_format:Y-m',
            'service_id' => 'nullable|integer',
        ]);

        $companyId = $request->company_id;
        $staffId = (int) $request->staff_id;
        $month = $request->month;
        $serviceId = $request->service_id ? (int) $request->service_id : null;

        $cacheKey = "book_dates_{$companyId}_{$staffId}_{$serviceId}_{$month}";

        $dates = Cache::remember($cacheKey, 300, function () use ($companyId, $staffId, $serviceId) {
            try {
                return $this->yclients->getBookDates($companyId, $staffId, $serviceId);
            } catch (\Throwable $e) {
                Log::warning('Yclients book_dates failed', ['error' => $e->getMessage()]);
                return [];
            }
        });

        // Filter to requested month
        $filtered = array_values(array_filter($dates, function ($d) use ($month) {
            $dateStr = is_array($d) ? ($d['date'] ?? '') : (string) $d;
            return str_starts_with($dateStr, $month);
        }));

        return response()->json($filtered);
    }

    protected function bookDatesForAnyMaster(string $companyId, ?int $serviceId = null): array
    {
        $staffList = $this->yclients->getStaff($companyId);
        $allDates = [];

        foreach ($staffList as $staff) {
            $staffId = $staff['id'] ?? null;
            if (! $staffId) continue;

            try {
                $dates = $this->yclients->getBookDates($companyId, (int) $staffId, $serviceId);
                foreach ($dates as $d) {
                    $dateStr = is_array($d) ? ($d['date'] ?? '') : (string) $d;
                    if ($dateStr && ! in_array($dateStr, $allDates)) {
                        $allDates[] = $dateStr;
                    }
                }
            } catch (\Throwable $e) {
                continue;
            }
        }

        sort($allDates);
        return $allDates;
    }

    public function myHistory(Request $request)
    {
        $user = $request->user();
        if (! $user->yclients_client_id) {
            return response()->json([]);
        }

        $companies = config('services.yclients.companies', []);
        $clientId = (int) $user->yclients_client_id;
        $start = now()->subMonths(6)->format('Y-m-d');
        $end = now()->format('Y-m-d');

        $allRecords = [];

        foreach ($companies as $companyId => $name) {
            try {
                $records = $this->yclients->getRecords(
                    (string) $companyId, $start, $end, null, $clientId
                );
                foreach ($records as $r) {
                    $allRecords[] = [
                        'date' => $r['date'] ?? $r['datetime'] ?? null,
                        'staff_name' => $r['staff']['name'] ?? $r['master'] ?? null,
                        'service' => $r['services'][0]['title'] ?? null,
                        'price' => $r['services'][0]['cost'] ?? $r['cost'] ?? 0,
                        'company' => $name,
                        'company_id' => (string) $companyId,
                    ];
                }
            } catch (\Throwable $e) {
                continue;
            }
        }

        // Sort by date descending, take last 5
        usort($allRecords, fn ($a, $b) => strcmp($b['date'] ?? '', $a['date'] ?? ''));
        return response()->json(array_slice($allRecords, 0, 5));
    }

    public function cancelRecord(Request $request, string $recordId)
    {
        $request->validate([
            'company_id' => 'required|string',
        ]);

        $user = $request->user();
        $companyId = $request->company_id;

        if (! in_array($user->role, ['staff', 'manager'], true)) {
            try {
                $record = $this->yclients->getRecord($companyId, $recordId);
                $recordClientId = $record['client']['id'] ?? null;
                $ownerById = $user->yclients_client_id && $recordClientId && (int) $recordClientId === (int) $user->yclients_client_id;
                if (! $ownerById) {
                    $recordPhone = $record['client']['phone'] ?? null;
                    $userPhone = $user->phone ? YclientsService::normalizePhone($user->phone) : '';
                    $ownerByPhone = $recordPhone && $userPhone && YclientsService::normalizePhone((string) $recordPhone) === $userPhone;
                    if (! $ownerByPhone) {
                        return response()->json(['message' => 'Вы не можете отменить чужую запись'], 403);
                    }
                }
            } catch (\Throwable $e) {
                return response()->json(['message' => 'Не удалось проверить запись'], 503);
            }
        }

        try {
            $this->yclients->deleteRecord($companyId, $recordId);
            return response()->json(['success' => true]);
        } catch (\Throwable $e) {
            Log::warning('Yclients deleteRecord failed', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Не удалось отменить запись'], 503);
        }
    }

    public function store(Request $request)
    {
        $request->validate([
            'company_id' => 'required|string',
            'client_id' => 'nullable|integer',
            'staff_id' => 'required|integer',
            'services' => 'required|array',
            'services.*' => 'integer',
            'datetime' => 'required|date',
            'seance_length' => 'required|integer',
        ]);

        $user = $request->user();
        $companyId = $request->company_id;
        $clientId = $request->client_id ? (int) $request->client_id : null;

        $isClientSession = $user->currentAccessToken()?->name === 'client-session';

        if (! $clientId && ($user->isClient() || $isClientSession)) {
            $clientId = $this->ensureClient($user, $companyId);
        }

        if (! $clientId) {
            return response()->json(['message' => 'Укажите клиента или войдите как клиент'], 422);
        }

        // Yclients ожидает datetime в формате "Y-m-d H:i:s"
        $datetime = $request->datetime;
        if (str_contains($datetime, 'T')) {
            // "2026-03-12T09:00:00Z" → "2026-03-12 09:00:00"
            $datetime = str_replace('T', ' ', preg_replace('/(\.\d+)?Z?$/', '', $datetime));
        }
        // Ensure seconds are present: "2026-03-12 09:00" → "2026-03-12 09:00:00"
        if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $datetime)) {
            $datetime .= ':00';
        }

        // API YClients требует объект client (phone, name), а не только client_id
        $clientPayload = $this->buildClientPayload($request, $user, $companyId, $clientId, $isClientSession);
        if (! $clientPayload) {
            return response()->json(['message' => 'Не удалось определить данные клиента (имя и телефон)'], 422);
        }

        $staffId = (int) $request->staff_id;

        // "Any master" — pick first available staff for this datetime
        if ($staffId === 0) {
            $firstServiceId = isset($request->services[0]) ? (int) $request->services[0] : null;
            $staffId = $this->pickAvailableStaff($companyId, $datetime, $firstServiceId);
            if (! $staffId) {
                return response()->json(['message' => 'Нет доступных мастеров на выбранное время'], 422);
            }
        }

        $payload = [
            'client' => $clientPayload,
            'staff_id' => $staffId,
            'services' => array_map(fn($id) => ['id' => (int) $id], $request->services),
            'datetime' => $datetime,
            'seance_length' => (int) $request->seance_length,
        ];

        Log::info('Yclients createRecord payload', ['company_id' => $companyId, 'payload' => $payload]);

        try {
            $record = $this->yclients->createRecord($companyId, $payload);
            return response()->json($record);
        } catch (\Throwable $e) {
            $msg = 'Не удалось создать запись.';
            if ($e instanceof RequestException && $e->response) {
                $body = $e->response->json();
                $yclientsMsg = $body['meta']['message'] ?? $body['message'] ?? $body['errors'][0]['message'] ?? null;
                if ($yclientsMsg) {
                    $msg = $yclientsMsg;
                }
                Log::warning('Yclients createRecord failed', [
                    'status' => $e->response->status(),
                    'body' => $body,
                ]);
            } else {
                Log::warning('Yclients createRecord failed', ['error' => $e->getMessage()]);
            }
            return response()->json(['message' => $msg], 503);
        }
    }

    /**
     * Формирует объект client для API YClients: id, phone и name обязательны.
     */
    protected function pickAvailableStaff(string $companyId, string $datetime, ?int $serviceId = null): ?int
    {
        $date = substr($datetime, 0, 10);
        $time = substr($datetime, 11, 5);
        $staffList = $this->yclients->getStaff($companyId);

        foreach ($staffList as $staff) {
            $staffId = $staff['id'] ?? null;
            if (! $staffId) continue;

            // Verify this staff member actually provides the requested service
            if ($serviceId) {
                try {
                    $services = $this->yclients->getServices($companyId, (int) $staffId);
                    $serviceIds = array_column($services, 'id');
                    if (! in_array($serviceId, $serviceIds)) {
                        continue;
                    }
                } catch (\Throwable $e) {
                    continue;
                }
            }

            try {
                $slots = $this->yclients->getBookTimes($companyId, (int) $staffId, $date);
                foreach ($slots as $slot) {
                    $slotTime = $slot['time'] ?? '';
                    if (str_starts_with($slotTime, $time)) {
                        return (int) $staffId;
                    }
                }
            } catch (\Throwable $e) {
                continue;
            }
        }

        return null;
    }

    protected function buildClientPayload(Request $request, User $user, string $companyId, int $clientId, bool $isClientSession = false): ?array
    {
        // Авторизованный клиент записывается сам — берём данные из user
        if (($user->isClient() || $isClientSession) && (int) $user->yclients_client_id === $clientId) {
            $phone = $user->phone ? YclientsService::normalizePhone($user->phone) : '';
            if ($phone === '') {
                return null;
            }
            $payload = [
                'id' => $clientId,
                'phone' => $phone,
                'name' => $user->name ?? 'Клиент',
            ];
            if (! empty($user->email)) {
                $payload['email'] = $user->email;
            }
            return $payload;
        }

        // client_id передан в запросе (например, запись создаёт сотрудник) — запрашиваем данные в YClients
        try {
            $clientData = $this->yclients->getClient($companyId, $clientId);
        } catch (\Throwable $e) {
            Log::warning('Yclients getClient failed', ['error' => $e->getMessage()]);
            return null;
        }

        $phone = isset($clientData['phone']) ? YclientsService::normalizePhone((string) $clientData['phone']) : '';
        $name = $clientData['name'] ?? $clientData['first_name'] ?? 'Клиент';
        if ($phone === '') {
            return null;
        }
        $payload = [
            'id' => $clientId,
            'phone' => $phone,
            'name' => $name,
        ];
        if (! empty($clientData['email'])) {
            $payload['email'] = $clientData['email'];
        }
        return $payload;
    }

    protected function ensureClient(User $user, string $companyId): ?int
    {
        if ($user->yclients_client_id) {
            return (int) $user->yclients_client_id;
        }

        $phone = $user->phone ? YclientsService::normalizePhone($user->phone) : '';
        if (! $phone) {
            return null;
        }

        try {
            $existing = $this->yclients->searchClients($companyId, $phone);
        } catch (\Throwable $e) {
            Log::warning('Yclients searchClients failed', ['error' => $e->getMessage()]);
            return null;
        }

        $clientData = $existing[0] ?? null;

        if ($clientData && isset($clientData['id'])) {
            $user->yclients_client_id = $clientData['id'];
            $user->name = $clientData['name'] ?? $clientData['first_name'] ?? $user->name;
            $user->save();

            return (int) $clientData['id'];
        }

        try {
            $created = $this->yclients->createClient($companyId, [
                'phone' => $phone,
                'name' => $user->name ?? 'Клиент',
            ]);
            $newId = $created['id'] ?? null;
            if ($newId) {
                $user->yclients_client_id = $newId;
                $user->save();

                return (int) $newId;
            }
        } catch (\Throwable $e) {
            report($e);
        }

        return null;
    }

    public function myRecords(Request $request)
    {
        $user = $request->user();
        if (! $user->yclients_client_id) {
            return response()->json([]);
        }

        $companyId = $request->input('company_id', config('services.yclients.company_id'));
        $start = $request->input('start_date', now()->format('Y-m-d'));
        $end = $request->input('end_date', now()->addMonths(1)->format('Y-m-d'));

        try {
            $records = $this->yclients->getRecords(
                $companyId,
                $start,
                $end,
                null,
                (int) $user->yclients_client_id
            );
            $records = array_map(fn($r) => array_merge($r, ['company_id' => $companyId]), $records);
            return response()->json($records);
        } catch (\Throwable $e) {
            Log::warning('Yclients getRecords failed', ['error' => $e->getMessage()]);
            return response()->json([]);
        }
    }

    public function staffRecords(Request $request)
    {
        $user = $request->user();
        if (! $user->yclients_staff_id) {
            return response()->json([]);
        }

        $companyId = $request->input('company_id', config('services.yclients.company_id'));
        $start = $request->input('start_date', now()->format('Y-m-d'));
        $end = $request->input('end_date', now()->format('Y-m-d'));

        try {
            $records = $this->yclients->getRecords(
                $companyId,
                $start,
                $end,
                (int) $user->yclients_staff_id,
                null
            );
            return response()->json($records);
        } catch (\Throwable $e) {
            Log::warning('Yclients staffRecords failed', ['error' => $e->getMessage()]);
            return response()->json([]);
        }
    }

    public function clientRecords(Request $request, int $clientId)
    {
        $user = $request->user();
        if (! $user->yclients_staff_id) {
            return response()->json(['message' => 'Доступно только сотрудникам'], 403);
        }

        $companyId = $request->input('company_id', config('services.yclients.company_id'));
        $start = now()->subMonths(6)->format('Y-m-d');
        $end = now()->format('Y-m-d');

        try {
            $records = $this->yclients->getRecords(
                $companyId,
                $start,
                $end,
                null,
                $clientId
            );
            return response()->json(array_slice($records, 0, 20));
        } catch (\Throwable $e) {
            Log::warning('Yclients clientRecords failed', ['error' => $e->getMessage()]);
            return response()->json([]);
        }
    }
}
