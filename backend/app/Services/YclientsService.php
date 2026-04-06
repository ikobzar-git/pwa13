<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class YclientsService
{
    protected PendingRequest $client;

    public function __construct()
    {
        $baseUrl = config('services.yclients.base_url');
        $bearer = config('services.yclients.bearer_token');
        $userToken = config('services.yclients.user_token');

        $this->client = Http::baseUrl($baseUrl)
            ->withHeaders([
                'Authorization' => "Bearer {$bearer}, User {$userToken}",
                'Accept' => 'application/vnd.yclients.v2+json',
                'Content-Type' => 'application/json',
            ])
            ->timeout(15);
    }

    public static function normalizePhone(string $phone): string
    {
        $phone = preg_replace('/\D/', '', $phone);

        // 89xx → 79xx (Russian mobile)
        if (strlen($phone) === 11 && str_starts_with($phone, '8')) {
            $phone = '7' . substr($phone, 1);
        }

        return $phone;
    }

    public static function formatDateForRequest(string $date): string
    {
        return date('Y-m-d', strtotime($date));
    }

    public function getCompanyInfo(string $companyId): array
    {
        return Cache::remember("yclients_company_{$companyId}", 86400, function () use ($companyId) {
            return $this->request('GET', "/company/{$companyId}");
        });
    }

    public function getBookDates(string $companyId, int $staffId, ?int $serviceId = null): array
    {
        // Correct URL: /book_dates/{company_id} with staff_id and service_ids as query params
        $params = [];
        if ($staffId > 0) {
            $params['staff_id'] = $staffId;
        }
        if ($serviceId) {
            $params['service_ids'] = [$serviceId];
        }

        $result = $this->request('GET', "/book_dates/{$companyId}", $params);

        // When staff_id is omitted (any master), booking_dates is a flat array of date strings
        if (isset($result['booking_dates']) && is_array($result['booking_dates']) && count($result['booking_dates']) > 0) {
            return $result['booking_dates'];
        }

        // When staff_id is specified, dates come in working_days: {"3": [12, 15, ...], "4": [1, 2, ...]}
        if (isset($result['working_days']) && is_array($result['working_days'])) {
            $dates = [];
            $currentYear = (int) date('Y');
            $currentMonth = (int) date('n');
            foreach ($result['working_days'] as $monthNum => $days) {
                $m = (int) $monthNum;
                $year = ($m < $currentMonth) ? $currentYear + 1 : $currentYear;
                foreach ($days as $day) {
                    $dates[] = sprintf('%04d-%02d-%02d', $year, $m, (int) $day);
                }
            }
            return $dates;
        }

        return is_array($result) ? $result : [];
    }

    public function getStaff(string $companyId, ?int $serviceId = null): array
    {
        $params = $serviceId ? ['service_id' => $serviceId] : [];
        return $this->request('GET', "/company/{$companyId}/staff", $params);
    }

    public function getServices(string $companyId, ?int $staffId = null): array
    {
        $params = $staffId !== null ? ['staff_id' => $staffId] : [];
        return $this->request('GET', "/company/{$companyId}/services", $params);
    }

    /**
     * Список ресурсов филиала (рабочие места / кабинеты). См. YClients API «Ресурсы».
     *
     * @return array<int, mixed>
     */
    public function getResources(string $companyId): array
    {
        return Cache::remember("yclients_resources_{$companyId}", 3600, function () use ($companyId) {
            $raw = $this->request('GET', "/resources/{$companyId}");

            if (is_array($raw) && array_is_list($raw)) {
                return $raw;
            }

            if (is_array($raw) && isset($raw['resources']) && is_array($raw['resources'])) {
                return $raw['resources'];
            }

            return is_array($raw) ? $raw : [];
        });
    }

    public function forgetResourcesCache(string $companyId): void
    {
        Cache::forget("yclients_resources_{$companyId}");
    }

    public function searchClients(string $companyId, string $query): array
    {
        $body = [
            'page' => 1,
            'page_size' => 200,
            'fields' => ['id', 'name', 'phone', 'first_name', 'last_name'],
            'filters' => [
                [
                    'type' => 'quick_search',
                    'state' => ['value' => $query],
                ],
            ],
        ];

        return $this->request('POST', "/company/{$companyId}/clients/search", $body);
    }

    public function getRecords(
        string $companyId,
        string $startDate,
        string $endDate,
        ?int $staffId = null,
        ?int $clientId = null
    ): array {
        $params = [
            'start_date' => self::formatDateForRequest($startDate),
            'end_date' => self::formatDateForRequest($endDate),
        ];
        if ($staffId !== null) {
            $params['staff_id'] = $staffId;
        }
        if ($clientId !== null) {
            $params['client_id'] = $clientId;
        }

        $response = $this->request('GET', "/records/{$companyId}", $params);
        $records = is_array($response) ? $response : [];

        return array_values(array_filter($records, fn ($r) => empty($r['deleted'] ?? false)));
    }

    public function getBookTimes(string $companyId, int $staffId, string $date): array
    {
        $dateStr = self::formatDateForRequest($date);
        return $this->request('GET', "/book_times/{$companyId}/{$staffId}/{$dateStr}");
    }

    public function createRecord(string $companyId, array $payload): array
    {
        return $this->request('POST', "/records/{$companyId}", $payload);
    }

    public function deleteRecord(string $companyId, string $recordId): array
    {
        return $this->request('DELETE', "/record/{$companyId}/{$recordId}");
    }

    public function createClient(string $companyId, array $data): array
    {
        return $this->request('POST', "/company/{$companyId}/clients", $data);
    }

    public function getClient(string $companyId, int $clientId): array
    {
        return $this->request('GET', "/client/{$companyId}/{$clientId}");
    }

    public function updateClient(string $companyId, int $clientId, array $data): array
    {
        return $this->request('PUT', "/client/{$companyId}/{$clientId}", $data);
    }

    protected function request(string $method, string $url, array $params = []): array
    {
        $response = match (strtoupper($method)) {
            'GET' => $this->client->get($url, $params),
            'POST' => $this->client->post($url, $params),
            'PUT' => $this->client->put($url, $params),
            'DELETE' => $this->client->delete($url, $params),
            default => throw new \InvalidArgumentException("Unsupported method: {$method}"),
        };

        if ($response->status() === 429) {
            Log::warning('Yclients rate limit 429');
            sleep(2);
            return $this->request($method, $url, $params);
        }

        $response->throw();
        $data = $response->json();

        return $data['data'] ?? $data;
    }
}
