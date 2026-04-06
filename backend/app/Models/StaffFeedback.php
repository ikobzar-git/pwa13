<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffFeedback extends Model
{
    protected $table = 'staff_feedback';

    protected $fillable = ['user_id', 'text', 'company_id', 'topic_id'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function topic(): BelongsTo
    {
        return $this->belongsTo(FeedbackTopic::class, 'topic_id');
    }
}
