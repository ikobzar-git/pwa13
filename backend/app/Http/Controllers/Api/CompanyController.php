<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\YclientsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CompanyController extends Controller
{
    public function __construct(
        protected YclientsService $yclients
    ) {}

    public function index()
    {
        $companies = config('services.yclients.companies', []);

        $result = collect($companies)->map(function ($name, $id) {
            $item = [
                'id' => $id,
                'name' => $name,
                'type' => $this->detectType($name),
                'address' => null,
            ];

            try {
                $info = $this->yclients->getCompanyInfo($id);
                $item['address'] = $info['address'] ?? null;
            } catch (\Throwable $e) {
                Log::warning('Yclients company info failed', ['company_id' => $id, 'error' => $e->getMessage()]);
            }

            return $item;
        })->values();

        return response()->json($result);
    }

    protected function detectType(string $name): string
    {
        $lower = mb_strtolower($name);
        if (str_contains($lower, 'бьюти') || str_contains($lower, 'beauty')) {
            return 'beauty';
        }
        return 'barber';
    }

    public function services(Request $request, string $companyId)
    {
        try {
            $staffId = $request->query('staff_id');
            $services = $this->yclients->getServices($companyId, $staffId ? (int) $staffId : null);
            return response()->json($services);
        } catch (\Throwable $e) {
            Log::warning('Yclients services failed', ['company_id' => $companyId, 'error' => $e->getMessage()]);
            return response()->json([]);
        }
    }

    public function staff(string $companyId)
    {
        try {
            $staff = $this->yclients->getStaff($companyId);
            return response()->json($staff);
        } catch (\Throwable $e) {
            Log::warning('Yclients staff failed', ['company_id' => $companyId, 'error' => $e->getMessage()]);
            return response()->json([]);
        }
    }

    public function searchClients(Request $request, string $companyId)
    {
        $query = $request->input('q', '');
        if (strlen($query) < 2) {
            return response()->json([]);
        }

        try {
            $clients = $this->yclients->searchClients($companyId, $query);
            return response()->json(array_slice($clients, 0, 20));
        } catch (\Throwable $e) {
            Log::warning('Yclients searchClients failed', ['company_id' => $companyId, 'error' => $e->getMessage()]);
            return response()->json([]);
        }
    }
}
