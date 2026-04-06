# PWA 13 by Timati — MVP

Сеть салонов красоты и барбершопов. PWA с интеграцией Yclients.

## Требования

- Docker и Docker Compose

## Запуск

```bash
# 1. Инициализация (первый раз)
chmod +x setup.sh
./setup.sh

# 2. Добавьте в backend/.env:
#    - YCLIENTS_BEARER_TOKEN
#    - YCLIENTS_USER_TOKEN
#    - APP_KEY (создаётся setup.sh)

# 3. Запуск
docker compose up
```

- **Backend:** http://localhost:8000
- **Frontend:** http://localhost:5173

## Создание сотрудника для теста

```bash
docker compose exec app php artisan tinker
# В tinker:
$u = new \App\Models\User;
$u->phone = '89637654416';
$u->password = bcrypt('test');
$u->role = 'staff';
$u->yclients_staff_id = 3481385;  # ID мастера из Yclients
$u->save();
```

## Структура

- `backend/` — Laravel API (Sanctum, Yclients)
- `frontend/` — React PWA (Vite)

## Этапы после MVP (реализованы)

- Форма записи для клиента
- Карточка клиента и заметки для сотрудника
- Web Push (напоминание за 15 мин)
- Service Worker (PWA)
- Обратная связь от сотрудников

## API (основные)

- `POST /api/login` — вход (phone, password опционально)
- `GET /api/user` — текущий пользователь
- `GET /api/companies` — список филиалов
- `GET /api/companies/{id}/services` — услуги
- `GET /api/companies/{id}/staff` — сотрудники
- `GET /api/records/slots` — слоты для записи
- `POST /api/records` — создание записи
- `GET /api/records/my` — мои записи (клиент)
- `GET /api/records/staff` — записи сотрудника
- `GET/POST/DELETE /api/clients/{id}/notes` — заметки о клиенте
- `POST /api/feedback` — обратная связь от сотрудника
- `GET /api/feedback` — список (только руководитель)
