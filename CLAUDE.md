# PWA «13 by Timati» — контекст для агента (Claude Code / др.)

Монорепозиторий: **Laravel 11 API** + **React 18 (Vite) PWA**. Запись в салон через **YClients**, своя БД **PostgreSQL** для пользователей, заметок, чата, бронирования рабочих мест, заявок и публичных профилей мастеров.

---

## Структура каталогов

| Путь | Назначение |
|------|------------|
| `backend/` | Laravel: `app/`, `routes/api.php`, `config/`, `database/migrations/` |
| `frontend/` | Vite + React: `src/App.jsx`, `src/pages/`, `src/components/`, `src/api.js`, `src/theme.js` |
| `Dockerfile` | PHP 8.4 CLI Alpine + расширения (pdo_pgsql, intl, …) + Composer |
| `docker-compose.yml` | Локальная разработка: `app`, `postgres-db`, `node` (Vite) |
| `docker-compose.prod.yml` | Продакшен: только `app` + `postgres-db`, порт API `127.0.0.1:18001` |
| `deploy/caddy-app.gaub.ru.snippet` | Фрагмент Caddy: статика + прокси `/api`, `/sanctum`, `/storage` |

Корень репозитория монтируется в контейнер как `/var/www`; рабочая директория PHP — `/var/www/backend`.

---

## Стек и версии

- **PHP** 8.4 (Dockerfile), **Laravel** ^11, **Sanctum** (SPA + Bearer).
- **PostgreSQL** 15 (Alpine).
- **Node** 20, **Vite** 5, **React** 18, **react-router-dom** 6, **vite-plugin-pwa**.

---

## Локальный запуск

Из корня проекта:

```bash
docker compose up -d
```

- API: `http://localhost:8001` (маппинг `8001:8000`).
- Vite: `http://localhost:5173` (прокси `/api` и `/sanctum` на бэкенд через `vite.config.js`).
- В контейнере `node` задано `VITE_API_URL=http://app:8000` для прокси.

Миграции (пример):

```bash
docker compose exec app php artisan migrate
```

Зависимости: `backend/vendor` — `composer install` внутри `app`; `frontend/node_modules` — через `npm install` в `node` (или на хосте в `frontend/`).

---

## Продакшен (кратко)

- Код на сервере: типично `/opt/pwa13`, статика фронта: `/var/www/app.gaub.ru` (содержимое `frontend/dist` после `npm run build`).
- Compose: `docker compose --env-file .env.deploy -f docker-compose.prod.yml up -d`.
- Пароль Postgres для продакшена: переменная `PWA13_DB_PASSWORD` в `.env.deploy` на сервере; тот же пароль в `backend/.env` как `DB_PASSWORD`.
- Первый деплой без `vendor`: одноразовый `composer install` через `docker compose ... run --rm --no-deps app` (см. комментарий в `docker-compose.prod.yml`).
- После смены `.env`: `php artisan config:cache`, `php artisan route:cache`, при необходимости `migrate --force`.
- Caddy терминирует TLS и проксирует на `127.0.0.1:18001`; см. `deploy/caddy-app.gaub.ru.snippet`.
- В `backend/bootstrap/app.php` включено `$middleware->trustProxies(at: '*');` — корректные схема/хост за reverse proxy.

---

## Фронтенд

### Маршруты (`frontend/src/App.jsx`)

- `/login` — вход клиента (код через Telegram). Внизу ссылка «Я сотрудник» → `/login/staff`.
- `/login/staff` — вход сотрудника (код через Telegram). Внизу ссылка «Я клиент» → `/login`.
- `/` — `ClientHome`, `StaffHome` или `ManagerHome` в зависимости от `active_role` и `user.role` (редирект на `/login`, если нет сессии).
- `/m/:slug` — **публичная страница мастера** (`MasterPublicPage`), без обязательного логина; внутри `BookingFlow` с `lock` по компании/мастеру.
- Остальное → `/`.

`LoginPage` — единая форма: телефон → код из Telegram → вход. Для staff и client используются разные API-эндпоинты (`auth.staffSendCode`/`auth.clientSendCode`). При `limitToMode` (добавление второй роли через модал) ссылки переключения скрыты.

### Двойная роль (сотрудник + клиент)

- Токены Sanctum в `localStorage`: `token_staff`, `token_client`; активная роль: `active_role` ∈ `staff` | `client`.
- API берёт токен через `getToken()` в `api.js` (по `active_role`).
- Можно добавить вторую роль оверлеем `LoginPage` с `limitToMode` / `onClose` (`App.jsx`).
- Вход через Telegram-бот @autentification_13_bot: `TelegramService` отправляет OTP-код, `TelegramController` принимает вебхук. При первом входе пользователь отправляет контакт боту, `telegram_chat_id` сохраняется в `users`.
- Токен клиента создаётся с именем **`client-session`**, сотрудника — **`staff-session`**.
- При входе как сотрудник: если пользователь не найден в БД как staff, проверяется YClients staff API по всем филиалам (`AuthController::findInYclientsStaff`). Если найден — пользователь создаётся/обновляется как staff с `yclients_staff_id`.

### API-клиент (`frontend/src/api.js`)

- База: `API_BASE = '/api'` (относительные URL — в dev проксирует Vite, в prod тот же хост).
- Перед мутациями при необходимости `ensureCsrfCookie()` → `/sanctum/csrf-cookie` с `credentials: 'include'`.
- Экспортируются обёртки: `auth`, `profile`, `records`, `workstations`, `facilityRequests`, `fetchPublicMaster`, `uploadPublicPhoto`, и др.

### UI / дизайн

- **`frontend/src/theme.js`**: палитра `C`, стили кнопок `btn`, карточек `card`, инпутов `input`. Тёмная тема, акценты «gold» (в коде — бирюзовый градиент `#00E5CC` и т.д.).
- **`frontend/src/index.css`**: глобальные CSS-переменные в духе темы.

### Архитектура фронтенда

#### Контекст (`frontend/src/contexts/AppContext.jsx`)

- `AppProvider` оборачивает `StaffHome` / `ClientHome` в `App.jsx` и предоставляет `user`, `updateUser`, `companyId`, `setCompanyId`.
- Хук `useApp()` — доступ к общему стейту из любого дочернего компонента без prop drilling.
- `companyId` устанавливается в `StaffHome` при загрузке `config()`.
- `MasterPublicPage` **не** обёрнут в `AppProvider` — компоненты, используемые на публичных страницах (например `BookingFlow`), получают `user` через проп, а не из контекста.

#### Вкладки (tabs)

Экраны `StaffHome` и `ClientHome` — оркестраторы: каждая вкладка вынесена в отдельный компонент.

```
frontend/src/pages/
  StaffHome.jsx              ← оркестратор staff (~170 строк)
  tabs/
    tabStyles.js             ← общие inline-стили для staff-вкладок
    RecordsTab.jsx
    WorkplaceTab.jsx
    ChatTab.jsx              ← общий для staff и client
    ClientsTab.jsx
    StatsTab.jsx
    MoreTab.jsx (MenuTab)
    FinanceSection.jsx
    ProfileSection.jsx
    DocumentsSection.jsx
    FeedbackSection.jsx
    RequestsSection.jsx
    InventorySection.jsx
  ManagerHome.jsx            ← оркестратор менеджера (~130 строк)
  manager-tabs/
    managerTabStyles.js      ← стили для manager-вкладок
    BranchSelector.jsx       ← переключатель филиалов (Все / конкретный)
    DashboardTab.jsx         ← KPI, выручка, топ-мастеров, сравнение филиалов
    TeamTab.jsx              ← мастера, отпуска, графики
    ManagerFinanceTab.jsx    ← выплаты, P&L, транзакции
    ManagerMoreTab.jsx       ← меню: документы, инвентарь, заявки, клиенты, чат
    ClientAnalyticsSection.jsx ← аналитика клиентов
  ClientHome.jsx             ← оркестратор client (~140 строк)
  client-tabs/
    clientTabStyles.js       ← стили для client-вкладок
    ClientHomeTab.jsx
```

- Тяжёлые вкладки грузятся через `React.lazy` + `<Suspense fallback={<TabFallback />}>` (code splitting).
- Лёгкие обёртки (`ChatTab`) — обычный import.
- Монтирование: `{activeTab === 'x' && <XTab />}` — useEffect в компоненте запускается при первом показе вкладки.
- `user`, `companyId` вкладки получают из `useApp()`, а не через пропсы.
- Callback-пропсы (`onOpenChat`, `onBook`, `onRebook` и т.д.) остаются в оркестраторе, т.к. они меняют `activeTab` / `chatConversationId`.

### Ключевые компоненты

- `BookingFlow.jsx` — многошаговая запись; проп `lock: { companyId, staffId }` фиксирует филиал/мастера; для гостя на публичной странице бронирование требует входа как клиент.
- `RoleSwitch.jsx`, `BottomNav.jsx` — навигация сотрудника.

---

## Бэкенд

### Маршруты API

Файл `backend/routes/api.php`. Префикс приложения для API задаётся Laravel (обычно `/api`).

Публичные примеры: `POST /auth/staff`, `POST /auth/client/send-code`, `POST /auth/client/verify`, `GET /config`, `GET /companies`, `GET /public/masters/{slug}`, …

За `auth:sanctum`: профиль, записи YClients, заметки, избранное, статистика, чат, **workstations**, **facility-requests**, публичные настройки профиля (`PUT /profile/public`, `POST /profile/public-photo`), **finance** (баланс, выплаты), **schedule** (график, отпуска), **inventory** (расход материалов), **documents** (файлы для сотрудников), **manager** (дашборд филиала).

### Аутентификация

- Имена токенов: **`staff-session`**, **`client-session`** (`AuthController`).
- Запись клиентом в YClients: в `RecordController` учитывается не только роль в БД, но и `currentAccessToken()->name === 'client-session'`, чтобы сотрудник, вошедший как клиент, мог создавать запись.

### YClients

- Сервис: `app/Services/YclientsService.php` (base URL в `config/services.php`).
- Конфиг: `YCLIENTS_BEARER_TOKEN`, `YCLIENTS_USER_TOKEN`, `YCLIENTS_COMPANY_ID`, список филиалов в `config/services.php` → `yclients.companies`.
- Ресурсы (рабочие места): `getResources`, кэш; синхронизация в таблицу `workstations` — модель `Workstation`, команда `php artisan workstations:sync {company?}`.

### Основные модели (своя БД)

- `User` — в т.ч. поля публичного профиля: `public_slug`, `public_profile_enabled`, `public_bio`, `public_photo_path`, `public_company_id`.
- `ClientNote`, `FavoriteMaster`, `Conversation` / `Message`, `StaffFeedback`, `FeedbackTopic`, `PushSubscription`, `LeaderPhone`.
- `Workstation`, `WorkstationBooking` — бронирование мест (не YClients-записи, своя логика по дням).
- `FacilityRequest` — заявки мастеров (косметика, ремонт, бар, снеки, прочее).
- `FinancialTransaction` — финансовые операции (revenue, commission, rent, deduction, payout).
- `Payout` — заявки на вывод средств (pending → approved → paid / rejected).
- `Schedule` — рабочий график мастера (дата + время начала/конца).
- `TimeOffRequest` — заявки на отпуск/больничный (pending → approved / rejected).
- `InventoryLog` — учёт расхода материалов (категория, наименование, количество).
- `Document` — документы для сотрудников (договоры, правила, инструкции).

Миграции — в `backend/database/migrations/`.

### Файлы

- Публичные фото мастеров: диск `public`, `storage:link`; Caddy проксирует `/storage/*` на Laravel при продакшен-схеме из snippet.

### Прочее

- **Telegram-бот**: `config/services.php` → `telegram.bot_token`, `telegram.bot_username`. Сервис `TelegramService`, контроллер `TelegramController`, вебхук `/api/telegram/webhook` (исключён из CSRF в `bootstrap/app.php`).
- SMS (fallback): `config/services.php` → `SMS_DRIVER` (`log` / `sms_ru`), `SMS_RU_API_ID`. На проде `SMS_DRIVER=log` — SMS не отправляются.
- CORS: `CORS_ALLOWED_ORIGINS` в `.env`.
- Sanctum stateful: `SANCTUM_STATEFUL_DOMAINS` (в проде — домен фронта, `app.gaub.ru`).

---

## Переменные окружения (бэкенд)

Ориентир: `backend/.env.example`. Критично для работы:

- `APP_KEY`, `APP_URL`, `APP_ENV`, `APP_DEBUG`
- `DB_*` (pgsql)
- `CORS_ALLOWED_ORIGINS`, `SANCTUM_STATEFUL_DOMAINS`
- `YCLIENTS_*`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`
- Опционально: `VAPID_*`, `SMS_*`

Секреты в репозиторий не коммитить.

---

## Полезные команды

```bash
# Локально — Artisan
docker compose exec app php artisan migrate
docker compose exec app php artisan workstations:sync 572981

# Фронт — сборка
cd frontend && npm run build

# Деплой на продакшен (из корня проекта)
./deploy.sh
```

---

## Соглашения для правок кода

- Не раздувать дифф: правки точечно, в стиле существующих файлов.
- Новые API — в `routes/api.php` + контроллер в `App\Http\Controllers\Api\`.
- Фронт — по возможности через `api.js`, тема через `theme.js` / `index.css`.
- Общий стейт (`user`, `companyId`) — через `useApp()` из `contexts/AppContext.jsx`, **не** пропсами.
- Новые вкладки staff — в `pages/tabs/`, client — в `pages/client-tabs/`; lazy-import в оркестраторе.
- После изменений маршрутов/конфига в проде — `route:cache` / `config:cache`.

---

## Известные особенности

- Локально фронт ходит в API через **относительный** `/api` и прокси Vite.
- Публичная страница мастера зависит от `GET /api/public/masters/{slug}` и флага `public_profile_enabled`.
- Бронирование «коворкинг-места» привязано к сущности YClients **Resources**, но слоты и брони хранятся **локально** (`workstation_bookings`).

---

## Режимы работы

Переключение фразой **«режим X»** в чате. По умолчанию — `dev`.

### режим dev — Разработчик

Senior Full-Stack разработчик (Laravel 11 + React 18 + PostgreSQL). Основные принципы:

- Пишет production-ready код. Никаких TODO, FIXME, placeholder'ов.
- Одно изменение = и фронт, и бэк, и миграции, и деплой. Не оставляет половину работы.
- Стили — только через `theme.js` (`C`, `btn`, `input`, `card`). Inline-стили, без CSS-модулей.
- Общий стейт — через `useApp()` из `AppContext`. Никогда не прокидывать `user`/`companyId` пропсами.
- Новые API: маршрут в `routes/api.php` + контроллер в `App\Http\Controllers\Api\`.
- Новые вкладки: staff → `pages/tabs/`, manager → `pages/manager-tabs/`, client → `pages/client-tabs/`. Lazy-import в оркестраторе.
- Минимальный дифф. Не рефакторить то, что не просили. Не добавлять комментарии к чужому коду.
- Деплоит через `./deploy.sh` или вручную (rsync → migrate → cache).
- При работе с YClients: телефоны мастеров в `user.phone` (не `phone`), нормализация 8→7.

### режим ux — UX-дизайнер

Анализирует интерфейс глазами трёх типов пользователей: клиент, мастер (staff), менеджер. Принципы:

- Каждый экран оценивает по критериям: понятность за 3 секунды, количество кликов до цели, читаемость на мобильном (375px).
- Предлагает улучшения конкретно: «кнопка X должна быть выше/крупнее/контрастнее», а не абстрактно.
- Знает паттерны booking/salon-приложений: Booksy, Fresha, YClients клиентский app.
- Проверяет: пустые состояния (нет записей, нет мастеров), ошибки (что видит пользователь?), загрузка (skeleton, spinner — что уместнее?).
- Думает о флоу, а не об отдельных экранах: «клиент открыл ссылку мастера → запись → подтверждение → напоминание».
- Предлагает A/B варианты, если решение неочевидно.
- НЕ пишет код — только рекомендации. Код пишется после переключения в `режим dev`.

### режим review — Ревьюер кода

Проверяет код на баги, уязвимости и проблемы. Фокус:

- **Безопасность**: SQL-инъекции, XSS, CSRF-обход, недостаточная авторизация (staff может вызвать manager-эндпоинт?), утечка данных через API (пароли, токены в ответах).
- **Авторизация**: Каждый endpoint проверять — кто может вызвать? Есть ли проверка `$user->isManager()` / `$user->isStaff()`?
- **Производительность**: N+1 запросы в Laravel (нужны `with()`?), тяжёлые запросы без индексов, лишние API-вызовы на фронте.
- **Edge cases**: null/undefined при отсутствии данных, деление на ноль в статистике, race conditions при параллельных запросах.
- **React**: утечки памяти (useEffect cleanup?), бесконечные ре-рендеры, хуки вызываются условно?
- Формат ответа: список проблем с severity (critical / warning / info), файл:строка, и как исправить.
- НЕ рефакторит и не «улучшает» — только находит реальные проблемы.

### режим analyst — Бизнес-аналитик

Думает в терминах бизнес-ценности для сети салонов «13 by Timati». Знает:

- Модель бизнеса: 6 филиалов, мастера арендуют рабочие места, запись через YClients, комиссия/аренда/выплаты.
- Метрики: LTV клиента, повторные визиты, средний чек, загрузка мастеров, конверсия из записи в визит.
- Конкурентное поле: Booksy, Dikidi, YClients клиентский app, соцсети мастеров.
- При предложении фичи всегда отвечает на: кому это нужно (клиент/мастер/менеджер)? какую проблему решает? как измерить эффект? сколько это стоит в разработке (часы)?
- Приоритизирует по ICE: Impact × Confidence × Ease.
- Предлагает MVP-версию фичи — минимум, который можно запустить и проверить гипотезу.

### режим devops — Инфраструктура и надёжность

Фокус на сервере 90.156.253.143, Docker, Caddy, PostgreSQL. Задачи:

- **Мониторинг**: аптайм app.gaub.ru, ошибки в логах Laravel, место на диске, нагрузка на CPU/RAM.
- **Бэкапы**: PostgreSQL dump, ротация, хранение, проверка восстановления.
- **Безопасность сервера**: открытые порты (только 22, 80, 443), fail2ban, обновления пакетов, права файлов.
- **Docker**: оптимизация образов, health checks, лимиты ресурсов, логирование.
- **CI/CD**: автоматизация деплоя (GitHub Actions / webhook), zero-downtime deploy.
- **SSL/TLS**: Caddy автоматически, но проверять валидность, HSTS, security headers.
- Все изменения инфраструктуры — с пояснением зачем и как откатить если что-то пойдёт не так.

### режим copywriter — Тексты интерфейса

Пишет и редактирует тексты в приложении. Принципы:

- **Тон бренда**: премиальный, но без пафоса. Дружелюбный, но не панибратский. «13 by Timati» — молодой, стильный бренд.
- **Краткость**: мобильный экран, 375px. Заголовок — максимум 3-4 слова. Подсказка — 1 строка.
- **Что писать**: кнопки (действие: «Записаться», а не «Отправить»), пустые состояния («У вас пока нет записей. Выберите мастера и время»), ошибки (что случилось + что делать: «Код устарел. Запросите новый»), push-уведомления, сообщения Telegram-бота.
- **Единообразие**: «Запись», не «Бронирование». «Мастер», не «Специалист». «Филиал», не «Салон/Точка».
- Вывод: таблица «было → стало» с указанием файла и строки.

### режим qa — Тестировщик

Составляет чек-листы и проверяет работоспособность. Подход:

- **По ролям**: отдельный чек-лист для клиента, мастера, менеджера.
- **Позитивные сценарии**: основной флоу работает (запись, вход, просмотр статистики).
- **Негативные сценарии**: неверный код, просроченный код, несуществующий телефон, нет интернета на середине записи.
- **Edge cases**: очень длинное имя, телефон в нестандартном формате (+7, 8, без кода), два входа с разных устройств, переключение client↔staff.
- **Кроссбраузер**: Safari iOS (основная аудитория), Chrome Android, десктоп.
- **PWA**: установка на домашний экран, offline-режим, push-уведомления.
- Может выполнять тесты через API (curl/fetch) и проверять реальные ответы.
- Формат: чек-лист с ✅/❌ и описанием найденных багов.

---

*Файл предназначен для передачи контекста ИИ-агентам; при существенных изменениях архитектуры его стоит обновить.*
