<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FinancialTransaction;
use App\Models\Payout;
use App\Models\User;
use Illuminate\Http\Request;

class FinanceController extends Controller
{
    public function balance(Request $request)
    {
        $user = $this->requireStaff($request);
        $companyId = $this->companyId($request);

        $totals = FinancialTransaction::query()
            ->where('user_id', $user->id)
            ->where('company_id', $companyId)
            ->selectRaw("
                COALESCE(SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN type = 'commission' THEN amount ELSE 0 END), 0) as total_commission,
                COALESCE(SUM(CASE WHEN type = 'rent' THEN amount ELSE 0 END), 0) as total_rent,
                COALESCE(SUM(CASE WHEN type = 'deduction' THEN amount ELSE 0 END), 0) as total_deductions,
                COALESCE(SUM(CASE WHEN type = 'payout' THEN amount ELSE 0 END), 0) as total_payouts
            ")
            ->first();

        $revenue = (float) ($totals->total_revenue ?? 0);
        $commission = (float) ($totals->total_commission ?? 0);
        $rent = (float) ($totals->total_rent ?? 0);
        $deductions = (float) ($totals->total_deductions ?? 0);
        $payoutsTotal = (float) ($totals->total_payouts ?? 0);

        $available = $revenue - $commission - $rent - $deductions - $payoutsTotal;

        $pendingPayout = Payout::query()
            ->where('user_id', $user->id)
            ->where('company_id', $companyId)
            ->whereIn('status', [Payout::STATUS_PENDING, Payout::STATUS_APPROVED])
            ->sum('amount');

        return response()->json([
            'total_revenue' => round($revenue, 2),
            'total_commission' => round($commission, 2),
            'total_rent' => round($rent, 2),
            'total_deductions' => round($deductions, 2),
            'total_payouts' => round($payoutsTotal, 2),
            'available' => round($available, 2),
            'pending_payout' => round($pendingPayout, 2),
        ]);
    }

    public function history(Request $request)
    {
        $user = $this->requireStaff($request);
        $companyId = $this->companyId($request);

        $transactions = FinancialTransaction::query()
            ->where('user_id', $user->id)
            ->where('company_id', $companyId)
            ->orderByDesc('created_at')
            ->limit(200)
            ->get();

        return response()->json($transactions);
    }

    public function payouts(Request $request)
    {
        $user = $this->requireStaff($request);
        $companyId = $this->companyId($request);

        $q = Payout::query()
            ->with('processor:id,name')
            ->where('company_id', $companyId);

        if ($user->isManager()) {
            $q->with('user:id,name,phone');
        } else {
            $q->where('user_id', $user->id);
        }

        return response()->json(
            $q->orderByDesc('created_at')->limit(100)->get()
        );
    }

    public function requestPayout(Request $request)
    {
        $user = $this->requireStaff($request);
        $companyId = $this->companyId($request);

        $request->validate([
            'amount' => 'required|numeric|min:1',
            'comment' => 'nullable|string|max:500',
        ]);

        $payout = Payout::create([
            'user_id' => $user->id,
            'company_id' => $companyId,
            'amount' => $request->input('amount'),
            'status' => Payout::STATUS_PENDING,
            'comment' => $request->input('comment'),
        ]);

        return response()->json($payout, 201);
    }

    public function processPayout(Request $request, int $id)
    {
        $user = $this->requireStaff($request);
        if (! $user->isManager()) {
            abort(403);
        }

        $companyId = $this->companyId($request);

        $request->validate([
            'status' => 'required|string|in:approved,paid,rejected',
            'admin_comment' => 'nullable|string|max:500',
        ]);

        $payout = Payout::query()
            ->where('id', $id)
            ->where('company_id', $companyId)
            ->firstOrFail();

        $payout->update([
            'status' => $request->input('status'),
            'admin_comment' => $request->input('admin_comment'),
            'processed_by' => $user->id,
            'processed_at' => now(),
        ]);

        if ($request->input('status') === Payout::STATUS_PAID) {
            FinancialTransaction::create([
                'user_id' => $payout->user_id,
                'company_id' => $companyId,
                'type' => FinancialTransaction::TYPE_PAYOUT,
                'amount' => $payout->amount,
                'description' => 'Выплата #' . $payout->id,
            ]);
        }

        return response()->json($payout->load('user:id,name,phone', 'processor:id,name'));
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
}
