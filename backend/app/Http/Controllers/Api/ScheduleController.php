<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Schedule;
use App\Models\TimeOffRequest;
use App\Models\User;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    public function index(Request $request)
    {
        $user = $this->requireStaff($request);
        $companyId = $this->companyId($request);

        $from = $request->query('from', now()->toDateString());
        $to = $request->query('to', now()->addDays(14)->toDateString());

        $schedule = Schedule::query()
            ->where('user_id', $user->id)
            ->where('company_id', $companyId)
            ->whereBetween('date', [$from, $to])
            ->orderBy('date')
            ->get();

        return response()->json($schedule);
    }

    public function store(Request $request)
    {
        $user = $this->requireStaff($request);
        $companyId = $this->companyId($request);

        $request->validate([
            'dates' => 'required|array|min:1',
            'dates.*.date' => 'required|date_format:Y-m-d',
            'dates.*.start_time' => 'required|date_format:H:i',
            'dates.*.end_time' => 'required|date_format:H:i|after:dates.*.start_time',
        ]);

        $result = [];
        foreach ($request->input('dates') as $day) {
            $result[] = Schedule::updateOrCreate(
                ['user_id' => $user->id, 'date' => $day['date']],
                [
                    'company_id' => $companyId,
                    'start_time' => $day['start_time'],
                    'end_time' => $day['end_time'],
                ]
            );
        }

        return response()->json($result, 201);
    }

    public function destroy(Request $request, int $id)
    {
        $user = $this->requireStaff($request);

        $schedule = Schedule::query()
            ->where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $schedule->delete();

        return response()->json(['deleted' => true]);
    }

    public function timeOffRequests(Request $request)
    {
        $user = $this->requireStaff($request);
        $companyId = $this->companyId($request);

        $q = TimeOffRequest::query()
            ->where('company_id', $companyId);

        if ($user->isManager()) {
            $q->with('user:id,name,phone');
        } else {
            $q->where('user_id', $user->id);
        }

        return response()->json(
            $q->orderByDesc('created_at')->limit(50)->get()
        );
    }

    public function requestTimeOff(Request $request)
    {
        $user = $this->requireStaff($request);
        $companyId = $this->companyId($request);

        $request->validate([
            'start_date' => 'required|date_format:Y-m-d',
            'end_date' => 'required|date_format:Y-m-d|after_or_equal:start_date',
            'type' => 'required|string|in:vacation,sick,personal',
            'reason' => 'nullable|string|max:500',
        ]);

        $timeOff = TimeOffRequest::create([
            'user_id' => $user->id,
            'company_id' => $companyId,
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
            'type' => $request->input('type'),
            'reason' => $request->input('reason'),
            'status' => TimeOffRequest::STATUS_PENDING,
        ]);

        return response()->json($timeOff, 201);
    }

    public function processTimeOff(Request $request, int $id)
    {
        $user = $this->requireStaff($request);
        if (! $user->isManager()) {
            abort(403);
        }

        $companyId = $this->companyId($request);

        $request->validate([
            'status' => 'required|string|in:approved,rejected',
        ]);

        $timeOff = TimeOffRequest::query()
            ->where('id', $id)
            ->where('company_id', $companyId)
            ->firstOrFail();

        $timeOff->update([
            'status' => $request->input('status'),
            'processed_by' => $user->id,
        ]);

        return response()->json($timeOff->load('user:id,name,phone'));
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
