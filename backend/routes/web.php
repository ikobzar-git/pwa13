<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return ['app' => 'PWA 13 by Timati API', 'version' => '1.0'];
});
