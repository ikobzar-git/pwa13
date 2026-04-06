<?php

namespace App\Services;

use App\Models\PushSubscription;
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

class WebPushService
{
    protected ?WebPush $push = null;

    public function send(PushSubscription $sub, string $title, string $body = ''): bool
    {
        $auth = config('services.webpush');
        if (empty($auth['vapid_public']) || empty($auth['vapid_private'])) {
            return false;
        }

        try {
            $push = $this->getPush();
            $subscription = Subscription::create([
                'endpoint' => $sub->endpoint,
                'keys' => $sub->keys,
            ]);

            $payload = json_encode([
                'title' => $title,
                'body' => $body,
            ]);

            $result = $push->sendOneNotification($subscription, $payload);

            return $result->isSuccess();
        } catch (\Throwable $e) {
            report($e);
            return false;
        }
    }

    protected function getPush(): WebPush
    {
        if ($this->push === null) {
            $auth = config('services.webpush');
            $this->push = new WebPush([
                'VAPID' => [
                    'subject' => config('services.webpush.subject', 'mailto:support@13timati.ru'),
                    'publicKey' => $auth['vapid_public'],
                    'privateKey' => $auth['vapid_private'],
                ],
            ]);
        }

        return $this->push;
    }
}
