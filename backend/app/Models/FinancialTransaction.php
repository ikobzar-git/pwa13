<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinancialTransaction extends Model
{
    public const TYPE_REVENUE = 'revenue';
    public const TYPE_COMMISSION = 'commission';
    public const TYPE_RENT = 'rent';
    public const TYPE_DEDUCTION = 'deduction';
    public const TYPE_PAYOUT = 'payout';

    protected $fillable = [
        'user_id',
        'company_id',
        'type',
        'amount',
        'description',
        'yclients_record_id',
        'period_date',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'period_date' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
