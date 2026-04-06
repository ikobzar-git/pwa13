<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('company_id', 32);
            $table->string('category', 24); // cosmetics, blades, towels, other
            $table->string('item_name');
            $table->integer('quantity')->default(1);
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'category']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_logs');
    }
};
