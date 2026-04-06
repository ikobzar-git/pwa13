<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\WebPushService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ChatController extends Controller
{
    public function __construct(protected WebPushService $pushService)
    {
    }

    public function conversations(Request $request)
    {
        $userId = $request->user()->id;

        $conversations = Conversation::where('client_user_id', $userId)
            ->orWhere('staff_user_id', $userId)
            ->with(['clientUser:id,name,phone', 'staffUser:id,name,phone', 'lastMessage'])
            ->withCount(['messages as unread_count' => function ($q) use ($userId) {
                $q->whereNull('read_at')->where('sender_user_id', '!=', $userId);
            }])
            ->orderByDesc('last_message_at')
            ->get();

        return response()->json($conversations);
    }

    public function storeConversation(Request $request)
    {
        $request->validate([
            'yclients_record_id' => 'required|string',
            'company_id' => 'required|string',
            'yclients_staff_id' => 'sometimes|string',
            'yclients_client_id' => 'sometimes|string',
        ]);

        $user = $request->user();

        if ($user->isClient()) {
            $staffUser = User::where('yclients_staff_id', $request->yclients_staff_id)->first();
            if (!$staffUser) {
                return response()->json(['message' => 'Мастер не зарегистрирован в приложении'], 422);
            }
            $clientUserId = $user->id;
            $staffUserId = $staffUser->id;
        } else {
            $clientUser = User::where('yclients_client_id', $request->yclients_client_id)->first();
            if (!$clientUser) {
                return response()->json(['message' => 'Клиент не зарегистрирован в приложении'], 422);
            }
            $clientUserId = $clientUser->id;
            $staffUserId = $user->id;
        }

        $conversation = Conversation::firstOrCreate(
            [
                'client_user_id' => $clientUserId,
                'staff_user_id' => $staffUserId,
                'yclients_record_id' => $request->yclients_record_id,
            ],
            [
                'company_id' => $request->company_id,
            ]
        );

        $conversation->load(['clientUser:id,name,phone', 'staffUser:id,name,phone', 'lastMessage']);

        return response()->json($conversation);
    }

    public function show(Request $request, $id)
    {
        $userId = $request->user()->id;

        $conversation = Conversation::where('id', $id)
            ->where(function ($q) use ($userId) {
                $q->where('client_user_id', $userId)->orWhere('staff_user_id', $userId);
            })
            ->with(['clientUser:id,name,phone', 'staffUser:id,name,phone'])
            ->firstOrFail();

        $messages = $conversation->messages()
            ->orderBy('created_at', 'asc')
            ->get();

        // Mark unread messages as read
        $conversation->messages()
            ->whereNull('read_at')
            ->where('sender_user_id', '!=', $userId)
            ->update(['read_at' => now()]);

        return response()->json([
            'conversation' => $conversation,
            'messages' => $messages,
        ]);
    }

    public function sendMessage(Request $request, $id)
    {
        $request->validate([
            'body' => 'required|string|max:1000',
        ]);

        $userId = $request->user()->id;

        $conversation = Conversation::where('id', $id)
            ->where(function ($q) use ($userId) {
                $q->where('client_user_id', $userId)->orWhere('staff_user_id', $userId);
            })
            ->firstOrFail();

        $message = $conversation->messages()->create([
            'sender_user_id' => $userId,
            'body' => $request->body,
        ]);

        $conversation->update(['last_message_at' => $message->created_at]);

        // Send push notification to recipient
        $recipientId = $conversation->client_user_id === $userId
            ? $conversation->staff_user_id
            : $conversation->client_user_id;

        $recipient = User::with('pushSubscriptions')->find($recipientId);
        $senderName = $request->user()->name ?? 'Собеседник';

        if ($recipient) {
            foreach ($recipient->pushSubscriptions as $sub) {
                $this->pushService->send($sub, "Сообщение от {$senderName}", Str::limit($message->body, 100));
            }
        }

        return response()->json($message);
    }

    public function unreadCount(Request $request)
    {
        $userId = $request->user()->id;

        $count = Message::whereHas('conversation', function ($q) use ($userId) {
            $q->where('client_user_id', $userId)->orWhere('staff_user_id', $userId);
        })
            ->whereNull('read_at')
            ->where('sender_user_id', '!=', $userId)
            ->count();

        return response()->json(['count' => $count]);
    }
}
