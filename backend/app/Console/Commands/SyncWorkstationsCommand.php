<?php

namespace App\Console\Commands;

use App\Models\Workstation;
use App\Services\YclientsService;
use Illuminate\Console\Command;

class SyncWorkstationsCommand extends Command
{
    protected $signature = 'workstations:sync {company? : YClients company id}';

    protected $description = 'Импорт рабочих мест из ресурсов YClients в таблицу workstations';

    public function handle(YclientsService $yclients): int
    {
        $companyId = (string) ($this->argument('company') ?: config('services.yclients.company_id'));
        if ($companyId === '') {
            $this->error('Не задан company id (аргумент или YCLIENTS_COMPANY_ID).');

            return self::FAILURE;
        }

        try {
            $n = Workstation::syncFromYclients($companyId, $yclients);
        } catch (\Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info("Синхронизировано записей: {$n} (филиал {$companyId}).");

        return self::SUCCESS;
    }
}
