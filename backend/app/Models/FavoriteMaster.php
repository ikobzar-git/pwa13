<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FavoriteMaster extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'yclients_staff_id',
        'company_id',
        'staff_name',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
