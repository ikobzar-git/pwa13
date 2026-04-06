<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryLog extends Model
{
    public const CATEGORY_COSMETICS = 'cosmetics';
    public const CATEGORY_BLADES = 'blades';
    public const CATEGORY_TOWELS = 'towels';
    public const CATEGORY_OTHER = 'other';

    protected $fillable = [
        'user_id',
        'company_id',
        'category',
        'item_name',
        'quantity',
        'note',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
