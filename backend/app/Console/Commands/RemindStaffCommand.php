<?php

namespace App\Console\Commands;

use App\Models\PushSubscription;
use App\Models\User;
use App\Services\WebPushService;
use App\Services\YclientsService;
use Illuminate\Console\Command;

class RemindStaffCommand extends Command
{
    protected $signature = 'remind:staff';

    protected $description = 'Напоминание сотрудникам о клиенте за 15 минут';

    public function handle(YclientsService $yclients, WebPushService $webPush): int
    {
        $companyId = config('services.yclients.company_id');
        $now = now();
        $windowStart = $now->copy()->addMinutes(14);
        $windowEnd = $now->copy()->addMinutes(16);

        $staffIds = User::whereNotNull('yclients_staff_id')->pluck('yclients_staff_id', 'id');

        foreach ($staffIds as $userId => $staffId) {
            $records = $yclients->getRecords(
                $companyId,
                $now->format('Y-m-d'),
                $now->format('Y-m-d'),
                (int) $staffId,
                null
            );

            foreach ($records as $record) {
                $recordDate = $record['datetime'] ?? $record['date'] ?? null;
                if (!$recordDate) continue;

                $dt = \Carbon\Carbon::parse($recordDate)->setTimezone(config('app.timezone'));
                if ($dt->between($windowStart, $windowEnd)) {
                    $clientName = $record['client']['name'] ?? $record['client']['first_name'] ?? 'Клиент';
                    $this->sendPush($webPush, $userId, "Через 15 мин: {$clientName}");
                }
            }
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
