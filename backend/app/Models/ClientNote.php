<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientNote extends Model
{
    protected $fillable = [
        'company_id',
        'yclients_client_id',
        'author_yclients_staff_id',
        'text',
        'category',
        'is_important',
    ];

    protected function casts(): array
    {
        return [
            'is_important' => 'boolean',
        ];
    }
}
