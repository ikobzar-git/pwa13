<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\TelegramService;
use App\Services\YclientsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class TelegramController extends Controller
{
    protected const CODE_CACHE_PREFIX = 'client_verify:';

    public function webhook(Request $request, TelegramService $telegram)
    {
        $data = $request->all();
        $message = $data['message'] ?? null;

        if (! $message) {
            return response()->json(['ok' => true]);
        }

        $chatId = (string) ($message['chat']['id'] ?? '');
        $text = trim($message['text'] ?? '');
        $contact = $message['contact'] ?? null;

        // Handle /start command
        if ($text === '/start') {
            $telegram->sendContactRequest($chatId);

            return response()->json(['ok' => true]);
        }

        // Handle shared contact
        if ($contact && ! empty($contact['phone_number'])) {
            $phone = YclientsService::normalizePhone($contact['phone_number']);

            $user = User::where('phone', $phone)->first();

            if (! $user) {
                $user = User::create([
                    'phone' => $phone,
                    'role' => 'client',
                    'telegram_chat_id' => $chatId,
                    'name' => trim(($contact['first_name'] ?? '') . ' ' . ($contact['last_name'] ?? '')) ?: null,
                ]);
            } else {
                $user->telegram_chat_id = $chatId;
                $user->save();
            }

            // Check for pending verification code
            $cachedCode = Cache::get(self::CODE_CACHE_PREFIX . $phone);
            if ($cachedCode) {
                $telegram->sendVerificationCode($chatId, $cachedCode);
                $telegram->sendMessage($chatId, '✅ Номер привязан! Код отправлен выше.', [
                    'remove_keyboard' => true,
                ]);
            } else {
                $telegram->sendMessage($chatId, '✅ Номер привязан! Теперь коды подтверждения будут приходить сюда.', [
                    'remove_keyboard' => true,
                ]);
            }

            return response()->json(['ok' => true]);
        }

        return response()->json(['ok' => true]);
    }
}
