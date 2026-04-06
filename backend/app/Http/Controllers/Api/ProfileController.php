<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        return response()->json($this->profilePayload($request->user()));
    }

    public function update(Request $request)
    {
        $request->validate([
            'name' => 'nullable|string|max:255',
            'preferences' => 'nullable|string|max:2000',
            'car_number' => 'nullable|string|max:20',
        ]);

        $user = $request->user();
        $user->fill($request->only(['name', 'preferences', 'car_number']));
        $user->save();

        return response()->json($this->profilePayload($user));
    }

    public function updatePublic(Request $request)
    {
        $user = $request->user();
        if (! $user->isStaff() && ! $user->isManager()) {
            abort(403, 'Публичная страница доступна мастерам');
        }

        $request->validate([
            'public_slug' => [
                'nullable',
                'string',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                'min:3',
                'max:64',
                Rule::unique('users', 'public_slug')->ignore($user->id),
            ],
            'public_profile_enabled' => 'boolean',
            'public_bio' => 'nullable|string|max:2000',
            'public_company_id' => 'nullable|string|max:32',
        ]);

        $enabled = $request->boolean('public_profile_enabled');
        $slug = $request->input('public_slug');
        if ($slug !== null) {
            $slug = strtolower(trim($slug));
        }

        if ($enabled && ! $slug && ! $user->public_slug) {
            throw ValidationException::withMessages([
                'public_slug' => ['Укажите адрес ссылки, чтобы включить публичную страницу.'],
            ]);
        }

        if ($request->filled('public_company_id')) {
            $this->assertCompanyAllowed((string) $request->input('public_company_id'));
        }

        // Only managers can toggle public_profile_enabled (via /manager/staff/{id}/public-profile)
        if ($user->isManager()) {
            $user->public_profile_enabled = $enabled;
        }
        if ($slug) {
            $user->public_slug = $slug;
        }
        if ($request->has('public_bio')) {
            $user->public_bio = $request->input('public_bio');
        }
        if ($request->has('public_company_id')) {
            $user->public_company_id = $request->input('public_company_id') ?: null;
        }
        $user->save();

        return response()->json($this->profilePayload($user));
    }

    public function uploadPublicPhoto(Request $request)
    {
        $user = $request->user();
        if (! $user->isStaff() && ! $user->isManager()) {
            abort(403);
        }

        $request->validate([
            'photo' => 'required|image|max:5120',
        ]);

        if ($user->public_photo_path) {
            Storage::disk('public')->delete($user->public_photo_path);
        }

        $path = $request->file('photo')->store('masters', 'public');
        $user->public_photo_path = $path;
        $user->save();

        return response()->json($this->profilePayload($user));
    }

    protected function profilePayload(\App\Models\User $user): array
    {
        $photoUrl = null;
        if ($user->public_photo_path) {
            $photoUrl = Storage::disk('public')->url($user->public_photo_path);
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'phone' => $user->phone,
            'preferences' => $user->preferences,
            'car_number' => $user->car_number,
            'role' => $user->role,
            'yclients_staff_id' => $user->yclients_staff_id,
            'public_slug' => $user->public_slug,
            'public_profile_enabled' => (bool) $user->public_profile_enabled,
            'public_bio' => $user->public_bio,
            'public_photo_url' => $photoUrl,
            'public_company_id' => $user->public_company_id,
        ];
    }

    protected function assertCompanyAllowed(string $companyId): void
    {
        $companies = config('services.yclients.companies', []);
        if ($companies !== [] && ! array_key_exists($companyId, $companies)) {
            throw ValidationException::withMessages([
                'public_company_id' => ['Неизвестный филиал'],
            ]);
        }
    }
}
