<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FacilityRequest extends Model
{
    public const CATEGORY_COSMETICS = 'cosmetics';

    public const CATEGORY_REPAIR = 'repair';

    public const CATEGORY_BAR = 'bar';

    public const CATEGORY_SNACKS = 'snacks';

    public const CATEGORY_OTHER = 'other';

    public const STATUS_NEW = 'new';

    public const STATUS_IN_PROGRESS = 'in_progress';

    public const STATUS_DONE = 'done';

    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'user_id',
        'company_id',
        'category',
        'title',
        'text',
        'status',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
