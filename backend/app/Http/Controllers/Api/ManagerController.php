<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FacilityRequest;
use App\Models\FinancialTransaction;
use App\Models\Payout;
use App\Models\Schedule;
use App\Models\TimeOffRequest;
use App\Models\User;
use App\Models\WorkstationBooking;
use Illuminate\Http\Request;

class ManagerController extends Controller
{
    public function dashboard(Request $request)
    {
        $user = $this->requireManager($request);
        $companyId = $this->companyId($request);

        $today = now()->toDateString();
        $weekStart = now()->startOfWeek()->toDateString();

        $todayRevenue = FinancialTransaction::query()
            ->where('company_id', $companyId)
            ->where('type', FinancialTransaction::TYPE_REVENUE)
            ->whereDate('created_at', $today)
            ->sum('amount');

        $weekRevenue = FinancialTransaction::query()
            ->where('company_id', $companyId)
            ->where('type', FinancialTransaction::TYPE_REVENUE)
            ->whereDate('created_at', '>=', $weekStart)
            ->sum('amount');

        $activeMasters = User::query()
            ->where('role', 'staff')
            ->whereNotNull('yclients_staff_id')
            ->count();

        $todayBookings = WorkstationBooking::query()
            ->where('company_id', $companyId)
            ->where('booked_date', $today)
            ->count();

        $topMasters = FinancialTransaction::query()
            ->where('company_id', $companyId)
            ->where('type', FinancialTransaction::TYPE_REVENUE)
            ->whereDate('created_at', '>=', $weekStart)
            ->selectRaw('user_id, SUM(amount) as total')
            ->groupBy('user_id')
            ->orderByDesc('total')
            ->limit(5)
            ->with('user:id,name')
            ->get()
            ->map(fn ($r) => [
                'name' => $r->user->name ?? 'Мастер',
                'total' => round($r->total, 2),
            ]);

        return response()->json([
            'today_revenue' => round($todayRevenue, 2),
            'week_revenue' => round($weekRevenue, 2),
            'active_masters' => $activeMasters,
            'today_bookings' => $todayBookings,
            'top_masters' => $topMasters,
        ]);
    }

    public function dashboardSummary(Request $request)
    {
        $this->requireManager($request);
        $companyId = $request->query('company_id');
        $isAll = ! $companyId || $companyId === 'all';

        $today = now()->toDateString();
        $weekStart = now()->startOfWeek()->toDateString();

        $revenueQuery = fn () => FinancialTransaction::query()
            ->where('type', FinancialTransaction::TYPE_REVENUE)
            ->when(! $isAll, fn ($q) => $q->where('company_id', $companyId));

        $todayRevenue = (clone $revenueQuery)()->whereDate('created_at', $today)->sum('amount');
        $weekRevenue = (clone $revenueQuery)()->whereDate('created_at', '>=', $weekStart)->sum('amount');

        $todayBookings = WorkstationBooking::query()
            ->when(! $isAll, fn ($q) => $q->where('company_id', $companyId))
            ->where('booked_date', $today)
            ->count();

        $activeMastersToday = Schedule::query()
            ->when(! $isAll, fn ($q) => $q->where('company_id', $companyId))
            ->where('date', $today)
            ->distinct('user_id')
            ->count('user_id');

        $pendingPayouts = Payout::where('status', Payout::STATUS_PENDING)
            ->when(! $isAll, fn ($q) => $q->where('company_id', $companyId))
            ->count();
        $pendingTimeOff = TimeOffRequest::where('status', TimeOffRequest::STATUS_PENDING)
            ->when(! $isAll, fn ($q) => $q->where('company_id', $companyId))
            ->count();
        $pendingFacility = FacilityRequest::where('status', FacilityRequest::STATUS_NEW)
            ->when(! $isAll, fn ($q) => $q->where('company_id', $companyId))
            ->count();

        $topMasters = (clone $revenueQuery)()
            ->whereDate('created_at', '>=', $weekStart)
            ->selectRaw('user_id, SUM(amount) as revenue, COUNT(DISTINCT yclients_record_id) as clients')
            ->groupBy('user_id')
            ->orderByDesc('revenue')
            ->limit(5)
            ->with('user:id,name')
            ->get()
            ->map(fn ($r) => [
                'user_id' => $r->user_id,
                'name' => $r->user->name ?? 'Мастер',
                'revenue' => round($r->revenue, 2),
                'clients' => (int) $r->clients,
                'avg_check' => $r->clients > 0 ? round($r->revenue / $r->clients) : 0,
            ]);

        $dailyRevenue = (clone $revenueQuery)()
            ->whereDate('created_at', '>=', now()->subDays(6)->toDateString())
            ->selectRaw("DATE(created_at) as date, SUM(amount) as revenue")
            ->groupByRaw('DATE(created_at)')
            ->orderBy('date')
            ->get()
            ->map(fn ($r) => [
                'date' => $r->date,
                'revenue' => round($r->revenue, 2),
            ]);

        return response()->json([
            'today_revenue' => round($todayRevenue, 2),
            'week_revenue' => round($weekRevenue, 2),
            'today_bookings' => (int) $todayBookings,
            'active_masters_today' => (int) $activeMastersToday,
            'pending_approvals' => [
                'payouts' => $pendingPayouts,
                'time_off' => $pendingTimeOff,
                'facility_requests' => $pendingFacility,
            ],
            'top_masters' => $topMasters,
            'daily_revenue' => $dailyRevenue,
        ]);
    }

    public function branches(Request $request)
    {
        $this->requireManager($request);

        $companies = config('services.yclients.companies', []);
        $today = now()->toDateString();
        $weekStart = now()->startOfWeek()->toDateString();

        $result = [];
        foreach ($companies as $cid => $name) {
            $todayRev = FinancialTransaction::where('company_id', $cid)
                ->where('type', FinancialTransaction::TYPE_REVENUE)
                ->whereDate('created_at', $today)
                ->sum('amount');

            $weekRev = FinancialTransaction::where('company_id', $cid)
                ->where('type', FinancialTransaction::TYPE_REVENUE)
                ->whereDate('created_at', '>=', $weekStart)
                ->sum('amount');

            $bookings = WorkstationBooking::where('company_id', $cid)
                ->where('booked_date', $today)
                ->count();

            $masters = Schedule::where('company_id', $cid)
                ->where('date', $today)
                ->distinct('user_id')
                ->count('user_id');

            $result[] = [
                'company_id' => (string) $cid,
                'name' => $name,
                'today_revenue' => round($todayRev, 2),
                'week_revenue' => round($weekRev, 2),
                'today_bookings' => $bookings,
                'active_masters' => $masters,
            ];
        }

        return response()->json($result);
    }

    public function staffStats(Request $request, int $userId)
    {
        $this->requireManager($request);
        $companyId = $this->companyId($request);
        $period = $request->query('period', 'week');

        $from = match ($period) {
            'day' => now()->toDateString(),
            'week' => now()->startOfWeek()->toDateString(),
            'month' => now()->startOfMonth()->toDateString(),
            'quarter' => now()->firstOfQuarter()->toDateString(),
            'year' => now()->startOfYear()->toDateString(),
            default => now()->startOfWeek()->toDateString(),
        };

        $revenueQuery = FinancialTransaction::where('user_id', $userId)
            ->where('company_id', $companyId)
            ->where('type', FinancialTransaction::TYPE_REVENUE)
            ->whereDate('created_at', '>=', $from);

        $totalRevenue = (clone $revenueQuery)->sum('amount');
        $completedRecords = (clone $revenueQuery)->distinct('yclients_record_id')->count('yclients_record_id');
        $uniqueClients = (clone $revenueQuery)->distinct('yclients_record_id')->count('yclients_record_id');

        return response()->json([
            'user_id' => $userId,
            'period' => $period,
            'completed_records' => $completedRecords,
            'total_revenue' => round($totalRevenue, 2),
            'avg_check' => $completedRecords > 0 ? round($totalRevenue / $completedRecords) : 0,
            'unique_clients' => $uniqueClients,
        ]);
    }

    public function staffPublicProfile(Request $request, int $userId)
    {
        $this->requireManager($request);

        $user = User::findOrFail($userId);

        return response()->json([
            'user_id' => $user->id,
            'name' => $user->name,
            'public_slug' => $user->public_slug,
            'public_profile_enabled' => (bool) $user->public_profile_enabled,
            'public_bio' => $user->public_bio,
            'public_photo_path' => $user->public_photo_path,
            'public_company_id' => $user->public_company_id,
        ]);
    }

    public function updateStaffPublicProfile(Request $request, int $userId)
    {
        $this->requireManager($request);

        $user = User::findOrFail($userId);

        $data = $request->validate([
            'public_profile_enabled' => 'sometimes|boolean',
            'public_slug' => 'sometimes|nullable|string|max:100',
            'public_bio' => 'sometimes|nullable|string|max:2000',
            'public_company_id' => 'sometimes|nullable|string|max:20',
        ]);

        if (isset($data['public_slug']) && $data['public_slug']) {
            $exists = User::where('public_slug', $data['public_slug'])
                ->where('id', '!=', $userId)
                ->exists();
            if ($exists) {
                return response()->json(['message' => 'Этот slug уже занят'], 422);
            }
        }

        $user->update($data);

        return response()->json([
            'user_id' => $user->id,
            'public_slug' => $user->public_slug,
            'public_profile_enabled' => (bool) $user->public_profile_enabled,
            'public_bio' => $user->public_bio,
            'public_company_id' => $user->public_company_id,
        ]);
    }

    public function financeOverview(Request $request)
    {
        $this->requireManager($request);
        $companyId = $request->query('company_id');
        $isAll = ! $companyId || $companyId === 'all';
        $period = $request->query('period', 'month');

        $from = match ($period) {
            'week' => now()->startOfWeek()->toDateString(),
            'month' => now()->startOfMonth()->toDateString(),
            'quarter' => now()->firstOfQuarter()->toDateString(),
            'year' => now()->startOfYear()->toDateString(),
            default => now()->startOfMonth()->toDateString(),
        };

        $baseQuery = fn () => FinancialTransaction::query()
            ->whereDate('created_at', '>=', $from)
            ->when(! $isAll, fn ($q) => $q->where('company_id', $companyId));

        $totalRevenue = (clone $baseQuery)()->where('type', FinancialTransaction::TYPE_REVENUE)->sum('amount');
        $totalCommissions = (clone $baseQuery)()->where('type', FinancialTransaction::TYPE_COMMISSION)->sum('amount');
        $totalRent = (clone $baseQuery)()->where('type', FinancialTransaction::TYPE_RENT)->sum('amount');
        $totalPayouts = (clone $baseQuery)()->where('type', FinancialTransaction::TYPE_PAYOUT)->sum('amount');

        $byMaster = (clone $baseQuery)()
            ->selectRaw("user_id,
                SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END) as revenue,
                SUM(CASE WHEN type = 'commission' THEN amount ELSE 0 END) as commission,
                SUM(CASE WHEN type = 'payout' THEN amount ELSE 0 END) as payouts")
            ->groupBy('user_id')
            ->orderByRaw("SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END) DESC")
            ->with('user:id,name')
            ->get()
            ->map(fn ($r) => [
                'user_id' => $r->user_id,
                'name' => $r->user->name ?? 'Мастер',
                'revenue' => round($r->revenue, 2),
                'commission' => round($r->commission, 2),
                'payouts' => round($r->payouts, 2),
            ]);

        $byDay = (clone $baseQuery)()
            ->where('type', FinancialTransaction::TYPE_REVENUE)
            ->selectRaw("DATE(created_at) as date, SUM(amount) as revenue")
            ->groupByRaw('DATE(created_at)')
            ->orderBy('date')
            ->get()
            ->map(fn ($r) => [
                'date' => $r->date,
                'revenue' => round($r->revenue, 2),
            ]);

        return response()->json([
            'period' => $period,
            'total_revenue' => round($totalRevenue, 2),
            'total_commissions' => round($totalCommissions, 2),
            'total_rent' => round($totalRent, 2),
            'total_payouts' => round($totalPayouts, 2),
            'net' => round($totalRevenue - $totalCommissions - $totalRent - $totalPayouts, 2),
            'by_master' => $byMaster,
            'by_day' => $byDay,
        ]);
    }

    public function transactions(Request $request)
    {
        $this->requireManager($request);
        $companyId = $request->query('company_id');
        $isAll = ! $companyId || $companyId === 'all';

        $query = FinancialTransaction::query()
            ->when(! $isAll, fn ($q) => $q->where('company_id', $companyId))
            ->when($request->query('user_id'), fn ($q, $uid) => $q->where('user_id', $uid))
            ->when($request->query('type'), fn ($q, $type) => $q->where('type', $type))
            ->when($request->query('from'), fn ($q, $from) => $q->whereDate('created_at', '>=', $from))
            ->when($request->query('to'), fn ($q, $to) => $q->whereDate('created_at', '<=', $to))
            ->with('user:id,name,phone')
            ->orderByDesc('created_at');

        return response()->json($query->paginate(30));
    }

    public function scheduleOverview(Request $request)
    {
        $this->requireManager($request);
        $companyId = $request->query('company_id');
        $isAll = ! $companyId || $companyId === 'all';

        $from = $request->query('from', now()->startOfWeek()->toDateString());
        $to = $request->query('to', now()->endOfWeek()->toDateString());

        $schedules = Schedule::query()
            ->when(! $isAll, fn ($q) => $q->where('company_id', $companyId))
            ->whereBetween('date', [$from, $to])
            ->with('user:id,name')
            ->orderBy('date')
            ->orderBy('start_time')
            ->get();

        $days = [];
        foreach ($schedules as $s) {
            $date = $s->date->toDateString();
            if (! isset($days[$date])) {
                $days[$date] = [];
            }
            $days[$date][] = [
                'user_id' => $s->user_id,
                'name' => $s->user->name ?? 'Мастер',
                'start_time' => $s->start_time,
                'end_time' => $s->end_time,
            ];
        }

        $result = [];
        foreach ($days as $date => $staff) {
            $result[] = ['date' => $date, 'staff' => $staff];
        }

        return response()->json(['days' => $result]);
    }

    public function clientStats(Request $request)
    {
        $this->requireManager($request);
        $companyId = $request->query('company_id');
        $isAll = ! $companyId || $companyId === 'all';
        $period = $request->query('period', 'month');

        $from = match ($period) {
            'week' => now()->startOfWeek()->toDateString(),
            'month' => now()->startOfMonth()->toDateString(),
            'quarter' => now()->firstOfQuarter()->toDateString(),
            'year' => now()->startOfYear()->toDateString(),
            default => now()->startOfMonth()->toDateString(),
        };

        $baseQuery = fn () => FinancialTransaction::query()
            ->where('type', FinancialTransaction::TYPE_REVENUE)
            ->whereDate('created_at', '>=', $from)
            ->whereNotNull('yclients_record_id')
            ->when(! $isAll, fn ($q) => $q->where('company_id', $companyId));

        $totalVisits = (clone $baseQuery)()->distinct('yclients_record_id')->count('yclients_record_id');
        $totalRevenue = (clone $baseQuery)()->sum('amount');

        return response()->json([
            'period' => $period,
            'total_visits' => $totalVisits,
            'total_revenue' => round($totalRevenue, 2),
            'avg_check' => $totalVisits > 0 ? round($totalRevenue / $totalVisits) : 0,
        ]);
    }

    public function staff(Request $request)
    {
        $this->requireManager($request);

        $staff = User::query()
            ->whereIn('role', ['staff', 'manager'])
            ->select('id', 'name', 'phone', 'role', 'yclients_staff_id', 'public_profile_enabled', 'public_slug', 'created_at')
            ->orderBy('name')
            ->get();

        return response()->json($staff);
    }

    protected function requireManager(Request $request): User
    {
        $user = $request->user();
        if (! $user->isManager()) {
            abort(403, 'Доступно руководителям');
        }
        return $user;
    }

    protected function companyId(Request $request): string
    {
        $q = $request->query('company_id');
        if ($q !== null && $q !== '') {
            return (string) $q;
        }
        return (string) config('services.yclients.company_id');
    }
}
