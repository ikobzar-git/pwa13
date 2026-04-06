<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\YclientsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class StatsController extends Controller
{
    public function __construct(
        protected YclientsService $yclients
    ) {}

    private function getDateRange(string $period): array
    {
        $today = now();
        $startDate = match ($period) {
            'day' => $today->copy()->startOfDay(),
            'week' => $today->copy()->subDays(6)->startOfDay(),
            'month' => $today->copy()->subDays(29)->startOfDay(),
            'quarter' => $today->copy()->subMonths(3)->startOfDay(),
            'year' => $today->copy()->subYear()->startOfDay(),
            default => $today->copy()->subDays(6)->startOfDay(),
        };
        return [$startDate, $today];
    }

    private function getRecordCost(array $r): float
    {
        if (isset($r['cost']) && is_numeric($r['cost'])) {
            return (float) $r['cost'];
        }
        if (isset($r['services']) && is_array($r['services'])) {
            $cost = 0;
            foreach ($r['services'] as $svc) {
                $cost += (float) ($svc['cost'] ?? $svc['price_min'] ?? 0);
            }
            return $cost;
        }
        return 0;
    }

    public function personal(Request $request)
    {
        $user = $request->user();
        if (! $user->yclients_staff_id) {
            return response()->json(['message' => 'Нет привязки к сотруднику YClients'], 422);
        }

        $period = $request->input('period', 'week');
        $companyId = $request->input('company_id', config('services.yclients.company_id'));

        [$startDate, $today] = $this->getDateRange($period);

        try {
            $records = $this->yclients->getRecords(
                $companyId,
                $startDate->format('Y-m-d'),
                $today->format('Y-m-d'),
                (int) $user->yclients_staff_id,
                null
            );
        } catch (\Throwable $e) {
            Log::warning('Yclients stats failed', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Не удалось загрузить данные'], 503);
        }

        $records = is_array($records) ? $records : [];

        $totalRecords = count($records);
        $completedRecords = 0;
        $cancelledRecords = 0;
        $totalRevenue = 0;
        $clientsSet = [];

        foreach ($records as $r) {
            $status = $r['attendance'] ?? $r['status'] ?? 0;
            if ($status == -1 || ($r['deleted'] ?? false)) {
                $cancelledRecords++;
                continue;
            }
            $completedRecords++;
            $totalRevenue += $this->getRecordCost($r);

            $clientId = $r['client']['id'] ?? null;
            if ($clientId) {
                $clientsSet[$clientId] = true;
            }
        }

        $uniqueClients = count($clientsSet);
        $avgCheck = $completedRecords > 0 ? round($totalRevenue / $completedRecords, 2) : 0;
        $cancelRate = $totalRecords > 0 ? round($cancelledRecords / $totalRecords * 100, 1) : 0;

        return response()->json([
            'period' => $period,
            'start_date' => $startDate->format('Y-m-d'),
            'end_date' => $today->format('Y-m-d'),
            'total_records' => $totalRecords,
            'completed_records' => $completedRecords,
            'cancelled_records' => $cancelledRecords,
            'cancel_rate' => $cancelRate,
            'total_revenue' => $totalRevenue,
            'avg_check' => $avgCheck,
            'unique_clients' => $uniqueClients,
        ]);
    }

    public function personalDaily(Request $request)
    {
        $user = $request->user();
        if (! $user->yclients_staff_id) {
            return response()->json(['message' => 'Нет привязки к сотруднику YClients'], 422);
        }

        $period = $request->input('period', 'week');
        $companyId = $request->input('company_id', config('services.yclients.company_id'));

        [$startDate, $today] = $this->getDateRange($period);

        try {
            $records = $this->yclients->getRecords(
                $companyId,
                $startDate->format('Y-m-d'),
                $today->format('Y-m-d'),
                (int) $user->yclients_staff_id,
                null
            );
        } catch (\Throwable $e) {
            Log::warning('Yclients stats daily failed', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Не удалось загрузить данные'], 503);
        }

        $records = is_array($records) ? $records : [];

        // Build daily buckets
        $daily = [];
        $cursor = $startDate->copy();
        while ($cursor->lte($today)) {
            $daily[$cursor->format('Y-m-d')] = [
                'date' => $cursor->format('Y-m-d'),
                'completed_records' => 0,
                'total_revenue' => 0,
                'unique_clients' => [],
                'cancelled' => 0,
                'total' => 0,
            ];
            $cursor->addDay();
        }

        foreach ($records as $r) {
            $dateStr = substr($r['datetime'] ?? $r['date'] ?? '', 0, 10);
            if (! isset($daily[$dateStr])) {
                continue;
            }

            $daily[$dateStr]['total']++;
            $status = $r['attendance'] ?? $r['status'] ?? 0;

            if ($status == -1 || ($r['deleted'] ?? false)) {
                $daily[$dateStr]['cancelled']++;
                continue;
            }

            $daily[$dateStr]['completed_records']++;
            $daily[$dateStr]['total_revenue'] += $this->getRecordCost($r);

            $clientId = $r['client']['id'] ?? null;
            if ($clientId) {
                $daily[$dateStr]['unique_clients'][$clientId] = true;
            }
        }

        // Finalize
        $days = [];
        foreach ($daily as $d) {
            $completed = $d['completed_records'];
            $total = $d['total'];
            $days[] = [
                'date' => $d['date'],
                'completed_records' => $completed,
                'total_revenue' => $d['total_revenue'],
                'avg_check' => $completed > 0 ? round($d['total_revenue'] / $completed, 2) : 0,
                'unique_clients' => count($d['unique_clients']),
                'cancel_rate' => $total > 0 ? round($d['cancelled'] / $total * 100, 1) : 0,
            ];
        }

        return response()->json([
            'period' => $period,
            'start_date' => $startDate->format('Y-m-d'),
            'end_date' => $today->format('Y-m-d'),
            'days' => $days,
        ]);
    }
}
