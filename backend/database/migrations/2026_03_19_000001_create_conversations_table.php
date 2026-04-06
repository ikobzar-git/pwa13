<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('staff_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('yclients_record_id');
            $table->string('company_id');
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();

            $table->unique(['client_user_id', 'staff_user_id', 'yclients_record_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};
