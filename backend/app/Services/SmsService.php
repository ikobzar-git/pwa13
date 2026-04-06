<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsService
{
    public function sendVerificationCode(string $phone, string $code): bool
    {
        $driver = config('services.sms.driver');

        if ($driver === 'log') {
            Log::info('SMS verification code (log driver)', ['phone' => $phone, 'code' => $code]);

            return true;
        }

        if ($driver === 'sms_ru') {
            return $this->sendViaSmsRu($phone, "Код подтверждения: {$code}");
        }

        return false;
    }

    protected function sendViaSmsRu(string $phone, string $message): bool
    {
        $apiId = config('services.sms.api_id');
        if (! $apiId) {
            Log::warning('SMS: SMS_RU_API_ID not configured');

            return false;
        }

        $phone = preg_replace('/\D/', '', $phone);
        if (str_starts_with($phone, '8')) {
            $phone = '7'.substr($phone, 1);
        } elseif (str_starts_with($phone, '7')) {
            // ok
        } else {
            $phone = '7'.$phone;
        }

        try {
            $res = Http::asForm()->post('https://sms.ru/sms/send', [
                'api_id' => $apiId,
                'to' => $phone,
                'msg' => $message,
                'json' => 1,
            ]);

            $data = $res->json();
            $status = $data['status'] ?? null;

            if ($status === 'OK') {
                return true;
            }

            Log::warning('SMS.ru send failed', ['response' => $data]);

            return false;
        } catch (\Throwable $e) {
            Log::error('SMS.ru exception', ['error' => $e->getMessage()]);

            return false;
        }
    }
}
