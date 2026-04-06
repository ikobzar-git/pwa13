<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Document extends Model
{
    public const CATEGORY_CONTRACT = 'contract';
    public const CATEGORY_RULES = 'rules';
    public const CATEGORY_INSTRUCTIONS = 'instructions';
    public const CATEGORY_GENERAL = 'general';

    protected $fillable = [
        'company_id',
        'title',
        'category',
        'file_path',
        'mime_type',
        'file_size',
        'uploaded_by',
    ];

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
