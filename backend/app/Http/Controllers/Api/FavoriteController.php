<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FavoriteMaster;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    public function index(Request $request)
    {
        $favorites = FavoriteMaster::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($favorites);
    }

    public function toggle(Request $request)
    {
        $request->validate([
            'yclients_staff_id' => 'required|integer',
            'company_id' => 'required|string',
            'staff_name' => 'nullable|string|max:255',
        ]);

        $userId = $request->user()->id;

        $existing = FavoriteMaster::where('user_id', $userId)
            ->where('yclients_staff_id', $request->yclients_staff_id)
            ->where('company_id', $request->company_id)
            ->first();

        if ($existing) {
            $existing->delete();
            return response()->json(['favorited' => false]);
        }

        FavoriteMaster::create([
            'user_id' => $userId,
            'yclients_staff_id' => $request->yclients_staff_id,
            'company_id' => $request->company_id,
            'staff_name' => $request->staff_name,
        ]);

        return response()->json(['favorited' => true]);
    }
}
