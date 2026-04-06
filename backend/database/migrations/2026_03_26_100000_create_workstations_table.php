<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workstations', function (Blueprint $table) {
            $table->id();
            $table->string('company_id', 32);
            $table->unsignedBigInteger('yclients_resource_id');
            // 0 = нет экземпляра (один ресурс без вложенных instances), чтобы unique работал в PostgreSQL
            $table->unsignedBigInteger('yclients_instance_id')->default(0);
            $table->string('title');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['company_id', 'yclients_resource_id', 'yclients_instance_id'], 'workstations_company_resource_instance_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workstations');
    }
};
