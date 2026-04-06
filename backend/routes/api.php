<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\TelegramController;
use App\Http\Controllers\Api\ClientNoteController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\FeedbackController;
use App\Http\Controllers\Api\FacilityRequestController;
use App\Http\Controllers\Api\FinanceController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\ManagerController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\PushSubscriptionController;
use App\Http\Controllers\Api\PublicMasterController;
use App\Http\Controllers\Api\RecordController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\WorkstationController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/staff', [AuthController::class, 'staffLogin']);
Route::post('/auth/staff/send-code', [AuthController::class, 'staffSendCode'])->middleware('throttle:5,1');
Route::post('/auth/staff/verify', [AuthController::class, 'staffVerify'])->middleware('throttle:10,5');
Route::post('/auth/client/send-code', [AuthController::class, 'clientSendCode'])->middleware('throttle:5,1');
Route::post('/auth/client/verify', [AuthController::class, 'clientVerify'])->middleware('throttle:10,5');

Route::get('/config', fn () => response()->json([
    'company_id' => config('services.yclients.company_id'),
    'vapid_public_key' => config('services.webpush.vapid_public'),
]));

Route::get('/companies', [CompanyController::class, 'index']);
Route::get('/companies/{companyId}/services', [CompanyController::class, 'services']);
Route::get('/companies/{companyId}/staff', [CompanyController::class, 'staff']);

Route::get('/public/masters/{slug}', [PublicMasterController::class, 'show']);

Route::get('/feedback/topics', [FeedbackController::class, 'topics']);

Route::post('/telegram/webhook', [TelegramController::class, 'webhook']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);

    Route::get('/records/slots', [RecordController::class, 'slots']);
    Route::post('/records', [RecordController::class, 'store']);
    Route::delete('/records/{recordId}', [RecordController::class, 'cancelRecord']);
    Route::get('/records/my', [RecordController::class, 'myRecords']);
    Route::get('/records/my-history', [RecordController::class, 'myHistory']);
    Route::get('/records/date-availability', [RecordController::class, 'dateAvailability']);

    Route::post('/push-subscribe', [PushSubscriptionController::class, 'store']);

    Route::get('/favorites', [FavoriteController::class, 'index']);
    Route::post('/favorites/toggle', [FavoriteController::class, 'toggle']);

    Route::prefix('chat')->group(function () {
        Route::get('/conversations', [ChatController::class, 'conversations']);
        Route::post('/conversations', [ChatController::class, 'storeConversation']);
        Route::get('/conversations/{id}', [ChatController::class, 'show']);
        Route::post('/conversations/{id}/messages', [ChatController::class, 'sendMessage']);
        Route::get('/unread-count', [ChatController::class, 'unreadCount']);
    });

    // Staff + Manager
    Route::middleware('role:staff,manager')->group(function () {
        Route::get('/companies/{companyId}/clients/search', [CompanyController::class, 'searchClients']);

        Route::put('/profile/public', [ProfileController::class, 'updatePublic']);
        Route::post('/profile/public-photo', [ProfileController::class, 'uploadPublicPhoto']);

        Route::get('/facility-requests', [FacilityRequestController::class, 'index']);
        Route::post('/facility-requests', [FacilityRequestController::class, 'store']);
        Route::patch('/facility-requests/{id}/status', [FacilityRequestController::class, 'updateStatus']);

        Route::get('/records/staff', [RecordController::class, 'staffRecords']);
        Route::get('/records/client/{clientId}', [RecordController::class, 'clientRecords']);

        Route::get('/clients/{yclientsClientId}/notes', [ClientNoteController::class, 'index']);
        Route::post('/clients/{yclientsClientId}/notes', [ClientNoteController::class, 'store']);
        Route::get('/notes/my', [ClientNoteController::class, 'my']);
        Route::delete('/notes/{id}', [ClientNoteController::class, 'destroy']);

        Route::post('/feedback', [FeedbackController::class, 'store']);
        Route::get('/feedback', [FeedbackController::class, 'index']);
        Route::get('/feedback/my', [FeedbackController::class, 'my']);

        Route::get('/stats/personal', [StatsController::class, 'personal']);
        Route::get('/stats/personal-daily', [StatsController::class, 'personalDaily']);

        Route::post('/workstations/sync', [WorkstationController::class, 'sync']);
        Route::get('/workstations', [WorkstationController::class, 'index']);
        Route::get('/workstations/availability', [WorkstationController::class, 'availability']);
        Route::get('/workstations/my-bookings', [WorkstationController::class, 'myBookings']);
        Route::post('/workstations/book', [WorkstationController::class, 'book']);
        Route::delete('/workstations/bookings/{bookingId}', [WorkstationController::class, 'cancelBooking']);

        Route::get('/finance/balance', [FinanceController::class, 'balance']);
        Route::get('/finance/history', [FinanceController::class, 'history']);
        Route::get('/finance/payouts', [FinanceController::class, 'payouts']);
        Route::post('/finance/payouts', [FinanceController::class, 'requestPayout']);

        Route::get('/schedule', [ScheduleController::class, 'index']);
        Route::post('/schedule', [ScheduleController::class, 'store']);
        Route::delete('/schedule/{id}', [ScheduleController::class, 'destroy']);
        Route::get('/schedule/time-off', [ScheduleController::class, 'timeOffRequests']);
        Route::post('/schedule/time-off', [ScheduleController::class, 'requestTimeOff']);

        Route::get('/inventory', [InventoryController::class, 'index']);
        Route::post('/inventory', [InventoryController::class, 'store']);
        Route::get('/inventory/summary', [InventoryController::class, 'summary']);

        Route::get('/documents', [DocumentController::class, 'index']);
        Route::post('/documents', [DocumentController::class, 'store']);
        Route::delete('/documents/{id}', [DocumentController::class, 'destroy']);
    });

    // Manager only
    Route::middleware('role:manager')->group(function () {
        Route::patch('/finance/payouts/{id}', [FinanceController::class, 'processPayout']);
        Route::patch('/schedule/time-off/{id}', [ScheduleController::class, 'processTimeOff']);

        Route::get('/manager/dashboard', [ManagerController::class, 'dashboard']);
        Route::get('/manager/dashboard/summary', [ManagerController::class, 'dashboardSummary']);
        Route::get('/manager/dashboard/branches', [ManagerController::class, 'branches']);
        Route::get('/manager/staff', [ManagerController::class, 'staff']);
        Route::get('/manager/staff/{userId}/stats', [ManagerController::class, 'staffStats']);
        Route::get('/manager/staff/{userId}/public-profile', [ManagerController::class, 'staffPublicProfile']);
        Route::patch('/manager/staff/{userId}/public-profile', [ManagerController::class, 'updateStaffPublicProfile']);
        Route::get('/manager/finance/overview', [ManagerController::class, 'financeOverview']);
        Route::get('/manager/finance/transactions', [ManagerController::class, 'transactions']);
        Route::get('/manager/schedule/overview', [ManagerController::class, 'scheduleOverview']);
        Route::get('/manager/clients/stats', [ManagerController::class, 'clientStats']);
    });
});
