<?php

return [
    'sms' => [
        'driver' => env('SMS_DRIVER', 'log'),
        'api_id' => env('SMS_RU_API_ID'),
        'from' => env('SMS_FROM', '13timati'),
    ],

    'telegram' => [
        'bot_token' => env('TELEGRAM_BOT_TOKEN'),
        'bot_username' => env('TELEGRAM_BOT_USERNAME', 'autentification_13_bot'),
    ],

    'webpush' => [
        'vapid_public' => env('VAPID_PUBLIC_KEY'),
        'vapid_private' => env('VAPID_PRIVATE_KEY'),
        'subject' => env('VAPID_SUBJECT', 'mailto:support@13timati.ru'),
    ],
    'yclients' => [
        'bearer_token' => env('YCLIENTS_BEARER_TOKEN'),
        'user_token' => env('YCLIENTS_USER_TOKEN'),
        'company_id' => env('YCLIENTS_COMPANY_ID', '572981'),
        'base_url' => 'https://api.yclients.com/api/v1',
        'companies' => [
            '572981' => 'Франшизы 13',
            '378272' => 'ББШ ТБ',
            '374153' => 'Бьюти ТБ',
            '378274' => 'ББШ Евро',
            '390374' => 'ББШ Щелк',
            '390380' => 'Бьюти Щелк',
        ],
    ],
];
