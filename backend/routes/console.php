<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('remind:staff')->everyMinute();
Schedule::command('remind:client')->everyFiveMinutes();
Schedule::command('records:remind')->everyThirtyMinutes();
