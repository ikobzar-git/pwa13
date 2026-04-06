<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClientNote;
use Illuminate\Http\Request;

class ClientNoteController extends Controller
{
    public function index(Request $request, int $yclientsClientId)
    {
        $user = $request->user();
        $companyId = $request->input('company_id', config('services.yclients.company_id'));

        $query = ClientNote::where('company_id', $companyId)
            ->where('yclients_client_id', $yclientsClientId);

        if ($user->yclients_staff_id) {
            $query->where(function ($q) use ($user) {
                $q->where('author_yclients_staff_id', $user->yclients_staff_id)
                    ->orWhere('category', '!=', 'personal');
            });
        }

        $notes = $query->orderByDesc('is_important')->orderByDesc('created_at')->get();

        return response()->json($notes);
    }

    public function store(Request $request, int $yclientsClientId)
    {
        $user = $request->user();
        if (! $user->yclients_staff_id) {
            return response()->json(['message' => 'Только сотрудники могут добавлять заметки'], 403);
        }

        $request->validate([
            'text' => 'required|string|max:5000',
            'category' => 'string|in:general,personal,other|max:50',
            'is_important' => 'boolean',
        ]);

        $companyId = $request->input('company_id', config('services.yclients.company_id'));

        $note = ClientNote::create([
            'company_id' => $companyId,
            'yclients_client_id' => $yclientsClientId,
            'author_yclients_staff_id' => $user->yclients_staff_id,
            'text' => $request->text,
            'category' => $request->input('category', 'general'),
            'is_important' => (bool) $request->input('is_important', false),
        ]);

        return response()->json($note, 201);
    }

    public function my(Request $request)
    {
        $user = $request->user();
        if (! $user->yclients_staff_id) {
            return response()->json([]);
        }

        $notes = ClientNote::where('author_yclients_staff_id', $user->yclients_staff_id)
            ->orderByDesc('is_important')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        return response()->json($notes);
    }

    public function destroy(Request $request, int $id)
    {
        $note = ClientNote::findOrFail($id);
        $user = $request->user();

        if ($note->author_yclients_staff_id != $user->yclients_staff_id) {
            return response()->json(['message' => 'Можно удалить только свою заметку'], 403);
        }

        $note->delete();

        return response()->json(['message' => 'Заметка удалена']);
    }
}
