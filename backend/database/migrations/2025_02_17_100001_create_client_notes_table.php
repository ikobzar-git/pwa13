<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_notes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('yclients_client_id');
            $table->unsignedBigInteger('author_yclients_staff_id');
            $table->text('text');
            $table->string('category', 50)->default('general');
            $table->boolean('is_important')->default(false);
            $table->timestamps();

            $table->index(['company_id', 'yclients_client_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_notes');
    }
};
