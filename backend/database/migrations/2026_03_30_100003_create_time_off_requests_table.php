<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('time_off_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('company_id', 32);
            $table->date('start_date');
            $table->date('end_date');
            $table->string('type', 24)->default('vacation'); // vacation, sick, personal
            $table->text('reason')->nullable();
            $table->string('status', 24)->default('pending'); // pending, approved, rejected
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['company_id', 'start_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('time_off_requests');
    }
};
