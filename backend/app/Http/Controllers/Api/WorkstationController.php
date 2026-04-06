<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Workstation;
use App\Models\WorkstationBooking;
use App\Services\YclientsService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WorkstationController extends Controller
{
    public function __construct(
        protected YclientsService $yclients
    ) {}

    public function sync(Request $request)
    {
        $user = $this->requireStaff($request);
        $companyId = $this->companyId($request);
        $this->assertCompanyAllowed($companyId);

        $n = Workstation::syncFromYclients($companyId, $this->yclients);

        return response()->json(['synced' => $n, 'company_id' => $companyId]);
    }

    public function index(Request $request)
    {
        $this->requireStaff($request);
        $companyId = $this->companyId($request);
        $this->assertCompanyAllowed($companyId);

        $list = Workstation::query()
            ->where('company_id', $companyId)
            ->where('is_active', true)
            ->orderBy('title')
            ->get();

        return response()->json($list);
    }

    public function availability(Request $request)
    {
        $this->requireStaff($request);
        $companyId = $this->companyId($request);
        $this->assertCompanyAllowed($companyId);

        $request->validate([
            'from' => 'required|date_format:Y-m-d',
            'to' => 'required|date_format:Y-m-d|after_or_equal:from',
        ]);

        $from = Carbon::parse($request->input('from'))->startOfDay();
        $to = Carbon::parse($request->input('to'))->startOfDay();
        if ($from->diffInDays($to) > 93) {
            throw ValidationException::withMessages(['to' => ['Интервал не более 93 дней.']]);
        }

        $workstations = Workstation::query()
            ->where('company_id', $companyId)
            ->where('is_active', true)
            ->orderBy('title')
            ->get(['id', 'title', 'company_id']);

        $booked = WorkstationBooking::query()
            ->where('status', WorkstationBooking::STATUS_CONFIRMED)
            ->whereIn('workstation_id', $workstations->pluck('id'))
            ->whereBetween('booked_date', [$from->toDateString(), $to->toDateString()])
            ->get(['workstation_id', 'booked_date', 'user_id']);

        $bookedMap = [];
        foreach ($booked as $b) {
            $d = $b->booked_date instanceof \DateTimeInterface
                ? $b->booked_date->format('Y-m-d')
                : (string) $b->booked_date;
            $bookedMap[$b->workstation_id][$d] = (int) $b->user_id;
        }

        $dates = [];
        for ($d = $from->copy(); $d->lte($to); $d->addDay()) {
            $dates[] = $d->format('Y-m-d');
        }

        $payload = $workstations->map(function ($ws) use ($dates, $bookedMap) {
            $perDate = [];
            foreach ($dates as $ds) {
                $holder = $bookedMap[$ws->id][$ds] ?? null;
                $perDate[$ds] = [
                    'free' => $holder === null,
                    'booked_by_user_id' => $holder,
                ];
            }

            return [
                'id' => $ws->id,
                'title' => $ws->title,
                'dates' => $perDate,
            ];
        });

        return response()->json([
            'company_id' => $companyId,
            'from' => $from->format('Y-m-d'),
            'to' => $to->format('Y-m-d'),
            'workstations' => $payload,
        ]);
    }

    public function myBookings(Request $request)
    {
        $user = $this->requireStaff($request);
        $companyId = $this->companyId($request);
        $this->assertCompanyAllowed($companyId);

        $list = WorkstationBooking::query()
            ->with(['workstation:id,title,company_id'])
            ->where('user_id', $user->id)
            ->where('status', WorkstationBooking::STATUS_CONFIRMED)
            ->whereHas('workstation', fn ($q) => $q->where('company_id', $companyId))
            ->where('booked_date', '>=', now()->toDateString())
            ->orderBy('booked_date')
            ->get();

        return response()->json($list);
    }

    public function book(Request $request)
    {
        $user = $this->requireStaff($request);
        $companyId = $this->companyId($request);
        $this->assertCompanyAllowed($companyId);

        $request->validate([
            'workstation_id' => 'required|integer|exists:workstations,id',
            'dates' => 'required|array|min:1',
            'dates.*' => 'date_format:Y-m-d',
        ]);

        $ws = Workstation::query()
            ->where('id', (int) $request->input('workstation_id'))
            ->where('company_id', $companyId)
            ->where('is_active', true)
            ->firstOrFail();

        $dates = array_values(array_unique($request->input('dates')));
        sort($dates);

        $created = [];
        try {
            DB::transaction(function () use ($ws, $user, $dates, &$created) {
                foreach ($dates as $ds) {
                    $exists = WorkstationBooking::query()
                        ->where('workstation_id', $ws->id)
                        ->where('booked_date', $ds)
                        ->where('status', WorkstationBooking::STATUS_CONFIRMED)
                        ->exists();
                    if ($exists) {
                        throw ValidationException::withMessages([
                            'dates' => ["Место уже занято на {$ds}."],
                        ]);
                    }
                    $created[] = WorkstationBooking::create([
                        'workstation_id' => $ws->id,
                        'user_id' => $user->id,
                        'booked_date' => $ds,
                        'status' => WorkstationBooking::STATUS_CONFIRMED,
                    ]);
                }
            });
        } catch (\Illuminate\Database\QueryException $e) {
            if (str_contains($e->getMessage(), 'workstation_bookings_one_active_per_day')) {
                throw ValidationException::withMessages(['dates' => ['Место уже занято на одну из выбранных дат.']]);
            }
            throw $e;
        }

        return response()->json([
            'bookings' => collect($created)->map(fn ($b) => $b->load('workstation:id,title,company_id')),
        ], 201);
    }

    public function cancelBooking(Request $request, int $bookingId)
    {
        $user = $this->requireStaff($request);
        $companyId = $this->companyId($request);
        $this->assertCompanyAllowed($companyId);

        $booking = WorkstationBooking::query()
            ->with('workstation')
            ->where('id', $bookingId)
            ->firstOrFail();

        if ($booking->workstation->company_id !== $companyId) {
            abort(404);
        }

        if ($booking->user_id !== $user->id && ! $user->isManager()) {
            abort(403);
        }

        if ($booking->status !== WorkstationBooking::STATUS_CONFIRMED) {
            return response()->json(['message' => 'Бронь уже отменена']);
        }

        $booking->status = WorkstationBooking::STATUS_CANCELLED;
        $booking->save();

        return response()->json(['message' => 'Бронь отменена']);
    }

    protected function requireStaff(Request $request): User
    {
        $user = $request->user();
        if (! $user->isStaff() && ! $user->isManager()) {
            abort(403, 'Доступно сотрудникам');
        }

        return $user;
    }

    protected function companyId(Request $request): string
    {
        $q = $request->query('company_id');
        if ($q !== null && $q !== '') {
            return (string) $q;
        }

        return (string) $request->input('company_id', config('services.yclients.company_id'));
    }

    protected function assertCompanyAllowed(string $companyId): void
    {
        $companies = config('services.yclients.companies', []);
        if ($companies !== [] && ! array_key_exists($companyId, $companies)) {
            abort(422, 'Неизвестный филиал');
        }
    }
}
