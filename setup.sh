#!/bin/bash
# Инициализация проекта PWA 13 by Timati
# Запускать при работающем Docker: ./setup.sh

set -e

echo "=== 1. Создание Laravel проекта (если vendor отсутствует) ==="
if [ ! -d "backend/vendor" ]; then
  docker run --rm -v "$(pwd)/backend:/app" -w /app composer:latest install --no-interaction
else
  echo "Backend vendor уже установлен, пропуск."
fi

echo "=== 2. Копирование .env ==="
if [ ! -f "backend/.env" ]; then
  cp backend/.env.example backend/.env
  echo "Создан backend/.env — добавьте YCLIENTS_BEARER_TOKEN, YCLIENTS_USER_TOKEN, APP_KEY"
else
  echo ".env уже существует."
fi

echo "=== 3. Генерация APP_KEY ==="
docker compose run --rm app sh -c "php artisan key:generate --ansi"

echo "=== 4. Запуск PostgreSQL и миграций ==="
docker compose up -d postgres-db
sleep 5
docker compose run --rm app sh -c "php artisan migrate --force"
docker compose run --rm app sh -c "php artisan db:seed --force"

echo "=== 5. Готово ==="
echo "Запуск backend: docker compose up app"
echo "Запуск фронта: docker compose up node"
echo "Или: docker compose up"
