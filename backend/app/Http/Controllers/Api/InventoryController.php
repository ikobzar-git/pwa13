<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryLog;
use App\Models\User;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        $user = $this->requireStaff($request);
        $companyId = $this->companyId($request);

        $q = InventoryLog::query()
            ->with('user:id,name')
            ->where('company_id', $companyId);

        if (! $user->isManager()) {
            $q->where('user_id', $user->id);
        }

        return response()->json(
            $q->orderByDesc('created_at')->limit(200)->get()
        );
    }

    public function store(Request $request)
    {
        $user = $this->requireStaff($request);
        $companyId = $this->companyId($request);

        $request->validate([
            'category' => 'required|string|in:cosmetics,blades,towels,other',
            'item_name' => 'required|string|max:255',
            'quantity' => 'required|integer|min:1',
            'note' => 'nullable|string|max:500',
        ]);

        $log = InventoryLog::create([
            'user_id' => $user->id,
            'company_id' => $companyId,
            'category' => $request->input('category'),
            'item_name' => $request->input('item_name'),
            'quantity' => $request->input('quantity'),
            'note' => $request->input('note'),
        ]);

        return response()->json($log->load('user:id,name'), 201);
    }

    public function summary(Request $request)
    {
        $user = $this->requireStaff($request);
        if (! $user->isManager()) {
            abort(403);
        }

        $companyId = $this->companyId($request);

        $summary = InventoryLog::query()
            ->where('company_id', $companyId)
            ->selectRaw('category, item_name, SUM(quantity) as total_quantity')
            ->groupBy('category', 'item_name')
            ->orderBy('category')
            ->orderByDesc('total_quantity')
            ->get();

        return response()->json($summary);
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
