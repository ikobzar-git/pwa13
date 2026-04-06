<?php

namespace App\Console\Commands;

use App\Models\PushSubscription;
use App\Models\User;
use App\Services\WebPushService;
use App\Services\YclientsService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class RemindClientCommand extends Command
{
    protected $signature = 'remind:client';

    protected $description = 'Напоминание клиентам о записи за 2 часа';

    public function handle(YclientsService $yclients, WebPushService $webPush): int
    {
        $companyId = config('services.yclients.company_id');
        $now = now();
        $windowStart = $now->copy()->addMinutes(115);
        $windowEnd = $now->copy()->addMinutes(125);

        try {
            $records = $yclients->getRecords(
                $companyId,
                $now->format('Y-m-d'),
                $now->format('Y-m-d'),
                null,
                null
            );
        } catch (\Throwable $e) {
            Log::warning('RemindClient: failed to fetch records', ['error' => $e->getMessage()]);
            return Command::SUCCESS;
        }

        foreach ($records as $record) {
            $recordDate = $record['datetime'] ?? $record['date'] ?? null;
            if (!$recordDate) continue;

            $dt = \Carbon\Carbon::parse($recordDate)->setTimezone(config('app.timezone'));
            if (!$dt->between($windowStart, $windowEnd)) continue;

            $clientPhone = $record['client']['phone'] ?? null;
            if (!$clientPhone) continue;

            $user = User::where('phone', $clientPhone)->first();
            if (!$user) continue;

            $staffName = $record['staff']['name'] ?? 'мастер';
            $time = $dt->format('H:i');
            $this->sendPush($webPush, $user->id, "Напоминание: запись в {$time} к {$staffName}");
        }

        return Command::SUCCESS;
    }

    protected function sendPush(WebPushService $webPush, int $userId, string $message): void
    {
        $subscriptions = PushSubscription::where('user_id', $userId)->get();

        foreach ($subscriptions as $sub) {
            $webPush->send($sub, '13 by Timati', $message);
        }
    }
}
