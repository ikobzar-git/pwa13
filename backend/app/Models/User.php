<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'phone',
        'email',
        'password',
        'name',
        'yclients_staff_id',
        'yclients_client_id',
        'telegram_chat_id',
        'preferences',
        'car_number',
        'public_slug',
        'public_profile_enabled',
        'public_bio',
        'public_photo_path',
        'public_company_id',
    ];

    protected $hidden = [
        'password',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'public_profile_enabled' => 'boolean',
        ];
    }

    public function isClient(): bool
    {
        return $this->role === 'client';
    }

    public function isStaff(): bool
    {
        return $this->role === 'staff';
    }

    public function isManager(): bool
    {
        return $this->role === 'manager';
    }

    public function pushSubscriptions()
    {
        return $this->hasMany(\App\Models\PushSubscription::class);
    }

    public function favoriteMasters()
    {
        return $this->hasMany(\App\Models\FavoriteMaster::class);
    }

    public function conversationsAsClient()
    {
        return $this->hasMany(\App\Models\Conversation::class, 'client_user_id');
    }

    public function conversationsAsStaff()
    {
        return $this->hasMany(\App\Models\Conversation::class, 'staff_user_id');
    }
}

