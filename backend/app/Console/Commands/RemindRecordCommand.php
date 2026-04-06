<?php

namespace App\Console\Commands;

use App\Models\PushSubscription;
use App\Models\User;
use App\Services\TelegramService;
use App\Services\WebPushService;
use App\Services\YclientsService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class RemindRecordCommand extends Command
{
    protected $signature = 'records:remind';

    protected $description = 'Напоминания клиентам о записях: за 24 часа и за 2 часа';

    public function handle(YclientsService $yclients, WebPushService $webPush, TelegramService $telegram): int
    {
        $companies = config('services.yclients.companies', []);
        if (empty($companies)) {
            $this->warn('Нет филиалов в конфигурации.');
            return self::SUCCESS;
        }

        $now = now();
        $today = $now->format('Y-m-d');
        $tomorrow = $now->copy()->addDay()->format('Y-m-d');
        $sent = 0;

        foreach ($companies as $companyId => $companyName) {
            try {
                $records = $yclients->getRecords((string) $companyId, $today, $tomorrow);
            } catch (\Throwable $e) {
                Log::warning("RemindRecord: не удалось получить записи филиала {$companyId}", [
                    'error' => $e->getMessage(),
                ]);
                $this->warn("Филиал {$companyId} ({$companyName}): ошибка — {$e->getMessage()}");
                continue;
            }

            foreach ($records as $record) {
                $recordDate = $record['datetime'] ?? $record['date'] ?? null;
                if (!$recordDate) {
                    continue;
                }

                $dt = Carbon::parse($recordDate)->setTimezone(config('app.timezone'));
                $diffMinutes = $now->diffInMinutes($dt, false);

                $type = $this->detectReminderType($diffMinutes);
                if (!$type) {
                    continue;
                }

                $recordId = $record['id'] ?? null;
                if (!$recordId) {
                    continue;
                }

                $cacheKey = "remind_{$recordId}_{$type}";
                if (Cache::has($cacheKey)) {
                    continue;
                }

                $clientPhone = $record['client']['phone'] ?? null;
                if (!$clientPhone) {
                    continue;
                }

                $phone = YclientsService::normalizePhone($clientPhone);
                $user = User::where('phone', $phone)->first();
                if (!$user) {
                    continue;
                }

                $time = $dt->format('H:i');
                $service = $this->extractServiceName($record);
                $message = $this->buildMessage($type, $time, $service, $companyName);

                $this->sendPush($webPush, $user, $message);
                $this->sendTelegram($telegram, $user, $message);

                Cache::put($cacheKey, true, now()->addHours(24));
                $sent++;

                $this->info("Отправлено ({$type}): {$user->phone} — {$message}");
                Log::info("RemindRecord: {$type}", [
                    'record_id' => $recordId,
                    'user_id' => $user->id,
                    'company' => $companyId,
                ]);
            }
        }

        $this->info("Всего отправлено напоминаний: {$sent}");

        return self::SUCCESS;
    }

    protected function detectReminderType(float $diffMinutes): ?string
    {
        if ($diffMinutes >= 90 && $diffMinutes <= 150) {
            return '2h';
        }

        if ($diffMinutes >= 1380 && $diffMinutes <= 1500) {
            return '24h';
        }

        return null;
    }

    protected function extractServiceName(array $record): string
    {
        if (!empty($record['services'])) {
            $names = array_column($record['services'], 'title');
            if ($names) {
                return implode(', ', $names);
            }
        }

        return $record['title'] ?? 'запись';
    }

    protected function buildMessage(string $type, string $time, string $service, string $companyName): string
    {
        if ($type === '24h') {
            return "Напоминаем: завтра в {$time} у вас {$service} в 13 by Timati ({$companyName})";
        }

        return "Через 2 часа у вас {$service} в 13 by Timati ({$companyName}). Ждём вас!";
    }

    protected function sendPush(WebPushService $webPush, User $user, string $message): void
    {
        $subscriptions = PushSubscription::where('user_id', $user->id)->get();

        foreach ($subscriptions as $sub) {
            $webPush->send($sub, '13 by Timati', $message);
        }
    }

    protected function sendTelegram(TelegramService $telegram, User $user, string $message): void
    {
        if (empty($user->telegram_chat_id)) {
            return;
        }

        $telegram->sendMessage($user->telegram_chat_id, $message);
    }
}
