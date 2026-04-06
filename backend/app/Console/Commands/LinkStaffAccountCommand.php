<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\YclientsService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class LinkStaffAccountCommand extends Command
{
    protected $signature = 'staff:link
                            {--phone=89637654416 : Телефон пользователя}
                            {--name=Жанна : Имя сотрудника в YClients (поиск по вхождению)}
                            {--password=staff : Пароль для входа}
                            {--company= : ID компании в YClients (по умолчанию из конфига)}';

    protected $description = 'Привязать аккаунт к реальному сотруднику YClients по имени';

    public function handle(YclientsService $yclients): int
    {
        $phone = YclientsService::normalizePhone($this->option('phone'));
        $searchName = $this->option('name');
        $password = $this->option('password');
        $companyId = $this->option('company') ?: config('services.yclients.company_id');

        if (! $companyId) {
            $this->error('Укажите company_id (--company=...) или YCLIENTS_COMPANY_ID в .env');
            return self::FAILURE;
        }

        $this->info("Компания: {$companyId}, ищем сотрудника: «{$searchName}»");

        try {
            $staffList = $yclients->getStaff($companyId);
        } catch (\Throwable $e) {
            $this->error('Не удалось загрузить список сотрудников: ' . $e->getMessage());
            return self::FAILURE;
        }

        $staffList = is_array($staffList) ? $staffList : [];
        $found = null;
        $searchLower = mb_strtolower($searchName);

        foreach ($staffList as $s) {
            $name = $s['name'] ?? $s['first_name'] ?? $s['full_name'] ?? '';
            if ($name !== '' && mb_strpos(mb_strtolower($name), $searchLower) !== false) {
                $found = $s;
                break;
            }
        }

        if (! $found || empty($found['id'])) {
            $this->warn('Сотрудник с таким именем не найден. Доступные:');
            foreach (array_slice($staffList, 0, 20) as $s) {
                $this->line('  - ' . ($s['name'] ?? $s['first_name'] ?? 'id=' . ($s['id'] ?? '?')));
            }
            if (count($staffList) > 20) {
                $this->line('  ... и ещё ' . (count($staffList) - 20));
            }
            return self::FAILURE;
        }

        $staffId = (int) $found['id'];
        $staffName = $found['name'] ?? $found['first_name'] ?? "ID {$staffId}";

        $user = User::updateOrCreate(
            ['phone' => $phone],
            [
                'name' => $staffName,
                'password' => Hash::make($password),
                'role' => 'staff',
                'yclients_staff_id' => $staffId,
            ]
        );

        $this->info("Аккаунт привязан к сотруднику: {$staffName} (YClients staff_id: {$staffId})");
        $this->line("Вход: телефон <comment>{$phone}</comment>, пароль <comment>{$password}</comment>");

        return self::SUCCESS;
    }
}
