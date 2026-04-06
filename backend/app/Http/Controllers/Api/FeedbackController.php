<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FeedbackTopic;
use App\Models\StaffFeedback;
use Illuminate\Http\Request;

class FeedbackController extends Controller
{
    public function topics()
    {
        $topics = FeedbackTopic::active()->ordered()->get(['id', 'name', 'department']);
        return response()->json($topics);
    }

    public function store(Request $request)
    {
        $request->validate([
            'text' => 'required|string|max:5000',
            'topic_id' => 'nullable|exists:feedback_topics,id',
        ]);

        $user = $request->user();
        if (! $user->isStaff() && ! $user->isManager()) {
            return response()->json(['message' => 'Только сотрудники могут оставлять обратную связь'], 403);
        }

        $feedback = StaffFeedback::create([
            'user_id' => $user->id,
            'text' => $request->text,
            'topic_id' => $request->input('topic_id'),
            'company_id' => $request->input('company_id'),
        ]);

        $feedback->load('topic:id,name');

        return response()->json($feedback, 201);
    }

    public function my(Request $request)
    {
        $user = $request->user();
        if (! $user->isStaff() && ! $user->isManager()) {
            return response()->json(['message' => 'Доступно только сотрудникам'], 403);
        }

        $items = StaffFeedback::with('topic:id,name')
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return response()->json($items);
    }

    public function index(Request $request)
    {
        $user = $request->user();
        if (! $user->isManager()) {
            return response()->json(['message' => 'Только руководители видят обратную связь'], 403);
        }

        $query = StaffFeedback::with(['user:id,name,phone', 'topic:id,name'])
            ->orderByDesc('created_at');

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->has('topic_id')) {
            $query->where('topic_id', $request->topic_id);
        }
        if ($request->has('from_date')) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }
        if ($request->has('to_date')) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        $items = $query->limit(100)->get();

        return response()->json($items);
    }
}
