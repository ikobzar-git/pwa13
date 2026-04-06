<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('staff_feedback', function (Blueprint $table) {
            $table->foreignId('topic_id')->nullable()->after('text')->constrained('feedback_topics')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('staff_feedback', function (Blueprint $table) {
            $table->dropConstrainedForeignId('topic_id');
        });
    }
};
