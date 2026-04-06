<?php

namespace App\Models;

use App\Services\YclientsService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Workstation extends Model
{
    protected $fillable = [
        'company_id',
        'yclients_resource_id',
        'yclients_instance_id',
        'title',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(WorkstationBooking::class);
    }

    /**
     * @return array<int, array{resource_id: int, instance_id: int, title: string}>
     */
    public static function flattenYclientsResources(array $items): array
    {
        $out = [];
        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }
            $rid = (int) ($item['id'] ?? $item['resource_id'] ?? 0);
            if ($rid <= 0) {
                continue;
            }
            $title = (string) ($item['title'] ?? $item['name'] ?? "Место #{$rid}");
            $instances = $item['instances'] ?? $item['booking_instances'] ?? null;
            if (is_array($instances) && $instances !== []) {
                foreach ($instances as $inst) {
                    if (! is_array($inst)) {
                        continue;
                    }
                    $iid = isset($inst['id']) ? (int) $inst['id'] : 0;
                    $instTitle = (string) ($inst['title'] ?? $inst['name'] ?? $title);
                    $out[] = [
                        'resource_id' => $rid,
                        'instance_id' => $iid > 0 ? $iid : 0,
                        'title' => $instTitle,
                    ];
                }
            } else {
                $out[] = [
                    'resource_id' => $rid,
                    'instance_id' => 0,
                    'title' => $title,
                ];
            }
        }

        return $out;
    }

    public static function syncFromYclients(string $companyId, YclientsService $yclients): int
    {
        $yclients->forgetResourcesCache($companyId);
        $raw = $yclients->getResources($companyId);
        $rows = self::flattenYclientsResources(is_array($raw) ? $raw : []);
        $count = 0;
        foreach ($rows as $row) {
            self::updateOrCreate(
                [
                    'company_id' => $companyId,
                    'yclients_resource_id' => $row['resource_id'],
                    'yclients_instance_id' => $row['instance_id'],
                ],
                [
                    'title' => $row['title'],
                    'is_active' => true,
                ]
            );
            $count++;
        }

        return $count;
    }
}
