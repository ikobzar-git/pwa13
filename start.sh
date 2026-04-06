#!/bin/bash
# Запуск PWA 13 by Timati

set -e
cd "$(dirname "$0")"

echo "Проверка Docker..."
if ! docker info >/dev/null 2>&1; then
  echo "Ошибка: Docker не запущен."
  echo "Запустите Docker Desktop и повторите."
  exit 1
fi

echo "=== Установка зависимостей backend ==="
if [ ! -d "backend/vendor" ]; then
  docker run --rm -v "$(pwd)/backend:/app" -w /app composer:latest install --no-interaction
fi

echo "=== Проверка .env ==="
if [ ! -f "backend/.env" ]; then
  cp backend/.env.example backend/.env
  echo "Создан backend/.env — добавьте YCLIENTS_BEARER_TOKEN, YCLIENTS_USER_TOKEN"
fi

echo "=== Запуск PostgreSQL ==="
docker compose up -d postgres-db
sleep 5

echo "=== Генерация ключа и миграции ==="
docker compose run --rm app php artisan key:generate --ansi 2>/dev/null || true
docker compose run --rm app php artisan migrate --force
docker compose run --rm app php artisan db:seed --force

echo "=== Запуск приложения ==="
docker compose up -d

echo ""
echo "Готово!"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo ""
echo "Если фронт не открывается, в отдельном терминале: cd frontend && npm run dev"
