<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workstation_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workstation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('booked_date');
            $table->string('status', 24)->default('confirmed');
            $table->timestamps();
        });

        DB::statement("CREATE UNIQUE INDEX workstation_bookings_one_active_per_day ON workstation_bookings (workstation_id, booked_date) WHERE status = 'confirmed'");
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS workstation_bookings_one_active_per_day');
        Schema::dropIfExists('workstation_bookings');
    }
};
