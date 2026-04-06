<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

class PublicMasterController extends Controller
{
    public function show(string $slug)
    {
        $slug = strtolower(trim($slug));
        $user = User::query()
            ->where('public_slug', $slug)
            ->where('public_profile_enabled', true)
            ->whereNotNull('yclients_staff_id')
            ->first();

        if (! $user) {
            return response()->json(['message' => 'Страница не найдена'], 404);
        }

        $companyId = $user->public_company_id ?: (string) config('services.yclients.company_id');
        $photoUrl = null;
        if ($user->public_photo_path) {
            $photoUrl = Storage::disk('public')->url($user->public_photo_path);
        }

        return response()->json([
            'slug' => $user->public_slug,
            'name' => $user->name,
            'bio' => $user->public_bio,
            'photo_url' => $photoUrl,
            'company_id' => $companyId,
            'yclients_staff_id' => (int) $user->yclients_staff_id,
        ]);
    }
}
