<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('public_slug', 64)->nullable()->unique()->after('car_number');
            $table->boolean('public_profile_enabled')->default(false)->after('public_slug');
            $table->text('public_bio')->nullable()->after('public_profile_enabled');
            $table->string('public_photo_path', 512)->nullable()->after('public_bio');
            $table->string('public_company_id', 32)->nullable()->after('public_photo_path');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'public_slug',
                'public_profile_enabled',
                'public_bio',
                'public_photo_path',
                'public_company_id',
            ]);
        });
    }
};
