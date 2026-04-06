<?php

namespace Database\Seeders;

use App\Models\FeedbackTopic;
use App\Models\LeaderPhone;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Тестовый менеджер
        // Телефон: 70000000001, пароль: manager123
        LeaderPhone::firstOrCreate(
            ['phone' => '70000000001'],
            ['name' => 'Тестовый Менеджер']
        );
        User::updateOrCreate(
            ['phone' => '70000000001'],
            [
                'name' => 'Тестовый Менеджер',
                'password' => Hash::make('manager123'),
                'role' => 'manager',
            ]
        );

        // Тестовый сотрудник для входа в интерфейс сотрудника
        // Телефон: 89001112222, пароль: staff
        User::updateOrCreate(
            ['phone' => '89001112222'],
            [
                'name' => 'Тестовый Сотрудник',
                'password' => Hash::make('staff'),
                'role' => 'staff',
                'yclients_staff_id' => null,
            ]
        );

        // Темы обращений для сегментации по отделам
        $topics = [
            ['name' => 'Техподдержка', 'department' => 'IT', 'sort_order' => 1],
            ['name' => 'HR / Кадры', 'department' => 'HR', 'sort_order' => 2],
            ['name' => 'Руководство', 'department' => 'Management', 'sort_order' => 3],
            ['name' => 'Финансы / Зарплата', 'department' => 'Finance', 'sort_order' => 4],
            ['name' => 'Предложения по улучшению', 'department' => null, 'sort_order' => 5],
            ['name' => 'Другое', 'department' => null, 'sort_order' => 100],
        ];
        foreach ($topics as $topic) {
            FeedbackTopic::firstOrCreate(['name' => $topic['name']], $topic);
        }
    }
}
