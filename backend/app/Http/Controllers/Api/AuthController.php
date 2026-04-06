<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaderPhone;
use App\Models\User;
use App\Services\SmsService;
use App\Services\TelegramService;
use App\Services\YclientsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    protected const CODE_TTL = 300;

    protected const CODE_CACHE_PREFIX = 'client_verify:';

    public function __construct(
        protected YclientsService $yclients,
        protected SmsService $sms,
        protected TelegramService $telegram
    ) {}

    public function staffLogin(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
            'password' => 'required|string',
        ]);

        $phone = YclientsService::normalizePhone($request->phone);
        $user = User::where('phone', $phone)->first();

        if (! $user || ! $user->password || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages(['phone' => ['Неверный телефон или пароль.']]);
        }

        if (! in_array($user->role, ['staff', 'manager'])) {
            throw ValidationException::withMessages(['phone' => ['Этот номер не зарегистрирован как сотрудник.']]);
        }

        if (LeaderPhone::where('phone', $phone)->exists()) {
            $user->role = 'manager';
            $user->save();
        }

        return $this->authenticated($user, 'staff-session');
    }

    public function staffSendCode(Request $request)
    {
        $request->validate(['phone' => 'required|string']);

        $phone = YclientsService::normalizePhone($request->phone);
        $user = User::where('phone', $phone)->first();

        // Already staff/manager or manager phone
        if (($user && in_array($user->role, ['staff', 'manager'])) || LeaderPhone::where('phone', $phone)->exists()) {
            return $this->sendCode($phone, $user);
        }

        // Check YClients staff across all branches
        $staffMatch = $this->findInYclientsStaff($phone);
        if (! $staffMatch) {
            throw ValidationException::withMessages(['phone' => ['Этот номер не найден среди сотрудников.']]);
        }

        return $this->sendCode($phone, $user);
    }

    public function staffVerify(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
            'code' => 'required|string|size:6',
        ]);

        $phone = YclientsService::normalizePhone($request->phone);
        $this->validateCode($phone, $request->code);

        $user = User::where('phone', $phone)->first();

        if (! $user || ! in_array($user->role, ['staff', 'manager'])) {
            $staffMatch = $this->findInYclientsStaff($phone);

            if (! $staffMatch && ! LeaderPhone::where('phone', $phone)->exists()) {
                throw ValidationException::withMessages(['phone' => ['Этот номер не найден среди сотрудников.']]);
            }

            if (! $user) {
                $user = User::create([
                    'phone' => $phone,
                    'role' => 'staff',
                    'name' => $staffMatch['name'] ?? null,
                    'yclients_staff_id' => $staffMatch['id'] ?? null,
                ]);
            } else {
                $user->role = 'staff';
                if ($staffMatch) {
                    $user->yclients_staff_id = $staffMatch['id'] ?? $user->yclients_staff_id;
                    $user->name = $user->name ?: ($staffMatch['name'] ?? null);
                }
                $user->save();
            }
        }

        if (LeaderPhone::where('phone', $phone)->exists()) {
            $user->role = 'manager';
            $user->save();
        }

        return $this->authenticated($user, 'staff-session');
    }

    public function clientSendCode(Request $request)
    {
        $request->validate(['phone' => 'required|string']);

        $phone = YclientsService::normalizePhone($request->phone);
        $user = User::where('phone', $phone)->first();

        return $this->sendCode($phone, $user);
    }

    public function clientVerify(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
            'code' => 'required|string|size:6',
        ]);

        $phone = YclientsService::normalizePhone($request->phone);
        $this->validateCode($phone, $request->code);

        $user = User::where('phone', $phone)->first();

        $companyId = config('services.yclients.company_id');
        if (! $user) {
            $clientData = null;
            try {
                if ($companyId && config('services.yclients.bearer_token')) {
                    $clients = $this->yclients->searchClients($companyId, $phone);
                    $clientData = $clients[0] ?? null;
                }
            } catch (\Throwable $e) {
                report($e);
            }

            $user = User::create([
                'phone' => $phone,
                'role' => 'client',
                'name' => $clientData ? ($clientData['name'] ?? $clientData['first_name'] ?? null) : null,
                'yclients_client_id' => $clientData ? ($clientData['id'] ?? null) : null,
            ]);
        }

        if ($companyId) {
            try {
                $clients = $this->yclients->searchClients($companyId, $phone);
                $clientData = $clients[0] ?? null;
                if ($clientData && isset($clientData['id'])) {
                    $user->yclients_client_id = $clientData['id'];
                    $user->name = $clientData['name'] ?? $clientData['first_name'] ?? $user->name;
                    $user->save();
                }
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return $this->authenticated($user, 'client-session');
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Выход выполнен']);
    }

    public function user(Request $request)
    {
        return response()->json($request->user());
    }

    protected function sendCode(string $phone, ?User $user): \Illuminate\Http\JsonResponse
    {
        $code = Str::padLeft((string) random_int(0, 999999), 6, '0');
        Cache::put(self::CODE_CACHE_PREFIX.$phone, $code, self::CODE_TTL);

        $botUsername = config('services.telegram.bot_username');

        if ($user && $user->telegram_chat_id) {
            $sent = $this->telegram->sendVerificationCode($user->telegram_chat_id, $code);
            if ($sent) {
                return response()->json([
                    'message' => 'Код отправлен в Telegram',
                    'method' => 'telegram',
                ]);
            }
        }

        if (config('services.telegram.bot_token')) {
            return response()->json([
                'message' => 'Откройте бота для получения кода',
                'method' => 'telegram_link',
                'bot_username' => $botUsername,
            ]);
        }

        $sent = $this->sms->sendVerificationCode($phone, $code);

        if (! $sent) {
            if (app()->environment('local')) {
                \Illuminate\Support\Facades\Log::info("[DEV] SMS код для {$phone}: {$code}");
            } else {
                throw ValidationException::withMessages(['phone' => ['Не удалось отправить код. Попробуйте позже.']]);
            }
        }

        return response()->json([
            'message' => 'Код отправлен на указанный номер',
            'method' => 'sms',
        ]);
    }

    protected function validateCode(string $phone, string $code): void
    {
        $cachedCode = Cache::get(self::CODE_CACHE_PREFIX.$phone);
        $codeValid = $cachedCode && $cachedCode === $code;

        if (! $codeValid && ! app()->environment('local')) {
            throw ValidationException::withMessages(['code' => ['Неверный или устаревший код.']]);
        }

        Cache::forget(self::CODE_CACHE_PREFIX.$phone);
    }

    protected function findInYclientsStaff(string $phone): ?array
    {
        $companies = config('services.yclients.companies', []);
        $phoneNorm = YclientsService::normalizePhone($phone);

        foreach (array_keys($companies) as $companyId) {
            try {
                $staffList = Cache::remember(
                    "yclients_staff_{$companyId}",
                    300,
                    fn () => $this->yclients->getStaff((string) $companyId)
                );

                foreach ($staffList as $member) {
                    // Check direct phone field
                    $memberPhone = YclientsService::normalizePhone($member['phone'] ?? '');
                    if ($memberPhone && $memberPhone === $phoneNorm) {
                        return $member;
                    }

                    // Check nested user.phone (YClients stores phone here)
                    $userPhone = YclientsService::normalizePhone($member['user']['phone'] ?? '');
                    if ($userPhone && $userPhone === $phoneNorm) {
                        return $member;
                    }
                }
            } catch (\Throwable $e) {
                continue;
            }
        }

        return null;
    }

    protected function authenticated(User $user, string $tokenName = 'pwa-session')
    {
        $user->tokens()->where('name', $tokenName)->delete();

        $token = $user->createToken($tokenName)->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }
}
