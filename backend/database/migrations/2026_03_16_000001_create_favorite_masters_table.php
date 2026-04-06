<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('favorite_masters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('yclients_staff_id');
            $table->string('company_id');
            $table->string('staff_name')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['user_id', 'yclients_staff_id', 'company_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('favorite_masters');
    }
};
