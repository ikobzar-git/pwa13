<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramService
{
    protected string $token;

    protected string $baseUrl;

    public function __construct()
    {
        $this->token = config('services.telegram.bot_token') ?? '';
        $this->baseUrl = "https://api.telegram.org/bot{$this->token}";
    }

    public function sendMessage(string $chatId, string $text, array $replyMarkup = []): bool
    {
        if (! $this->token) {
            Log::warning('Telegram: bot token not configured');

            return false;
        }

        try {
            $payload = [
                'chat_id' => $chatId,
                'text' => $text,
                'parse_mode' => 'HTML',
            ];

            if ($replyMarkup) {
                $payload['reply_markup'] = json_encode($replyMarkup);
            }

            $res = Http::post("{$this->baseUrl}/sendMessage", $payload);

            if ($res->successful() && $res->json('ok')) {
                return true;
            }

            Log::warning('Telegram sendMessage failed', ['response' => $res->json()]);

            return false;
        } catch (\Throwable $e) {
            Log::error('Telegram exception', ['error' => $e->getMessage()]);

            return false;
        }
    }

    public function sendVerificationCode(string $chatId, string $code): bool
    {
        return $this->sendMessage(
            $chatId,
            "🔐 Ваш код подтверждения: <b>{$code}</b>\n\nНикому не сообщайте этот код."
        );
    }

    public function sendContactRequest(string $chatId): bool
    {
        return $this->sendMessage(
            $chatId,
            "Добро пожаловать в <b>13 by Timati</b>! 💈\n\nОтправьте свой номер телефона кнопкой ниже, чтобы получать коды подтверждения.",
            [
                'keyboard' => [[
                    ['text' => '📱 Отправить номер телефона', 'request_contact' => true],
                ]],
                'resize_keyboard' => true,
                'one_time_keyboard' => true,
            ]
        );
    }

    public function setWebhook(string $url): array
    {
        $res = Http::post("{$this->baseUrl}/setWebhook", [
            'url' => $url,
            'allowed_updates' => ['message'],
        ]);

        return $res->json() ?: [];
    }
}
