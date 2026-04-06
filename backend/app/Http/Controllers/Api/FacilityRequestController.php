<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FacilityRequest;
use App\Models\User;
use Illuminate\Http\Request;

class FacilityRequestController extends Controller
{
    public function index(Request $request)
    {
        $user = $this->requireStaff($request);
        $companyId = $this->companyId($request);
        $this->assertCompanyAllowed($companyId);

        $q = FacilityRequest::query()->with('user:id,name,phone')->where('company_id', $companyId);

        if (! $user->isManager()) {
            $q->where('user_id', $user->id);
        }

        $list = $q->orderByDesc('created_at')->limit(200)->get();

        return response()->json($list);
    }

    public function store(Request $request)
    {
        $user = $this->requireStaff($request);
        $companyId = $this->companyId($request);
        $this->assertCompanyAllowed($companyId);

        $request->validate([
            'category' => 'required|string|in:cosmetics,repair,bar,snacks,other',
            'title' => 'nullable|string|max:255',
            'text' => 'required|string|max:5000',
        ]);

        $row = FacilityRequest::create([
            'user_id' => $user->id,
            'company_id' => $companyId,
            'category' => $request->input('category'),
            'title' => $request->input('title'),
            'text' => $request->input('text'),
            'status' => FacilityRequest::STATUS_NEW,
        ]);

        return response()->json($row->load('user:id,name,phone'), 201);
    }

    public function updateStatus(Request $request, int $id)
    {
        $user = $this->requireStaff($request);
        if (! $user->isManager()) {
            abort(403);
        }

        $companyId = $this->companyId($request);
        $this->assertCompanyAllowed($companyId);

        $request->validate([
            'status' => 'required|string|in:new,in_progress,done,rejected',
        ]);

        $row = FacilityRequest::query()
            ->where('id', $id)
            ->where('company_id', $companyId)
            ->firstOrFail();

        $row->status = $request->input('status');
        $row->save();

        return response()->json($row->load('user:id,name,phone'));
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
