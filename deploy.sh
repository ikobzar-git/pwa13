#!/bin/bash
set -e

SERVER="root@90.156.253.143"
PASS="Voc3eqvSeM%Q"
SSH="sshpass -p '$PASS' ssh -o StrictHostKeyChecking=no -o PubkeyAuthentication=no $SERVER"
RSYNC="sshpass -p '$PASS' rsync -avz -e 'ssh -o StrictHostKeyChecking=no -o PubkeyAuthentication=no'"
COMPOSE="docker compose --env-file .env.deploy -f docker-compose.prod.yml"

echo "=== 1/4 Сборка фронтенда ==="
cd frontend && npx vite build && cd ..

echo ""
echo "=== 2/4 Синхронизация бэкенда ==="
eval $RSYNC --delete \
  --exclude='.env' --exclude='.env.deploy' --exclude='vendor' \
  --exclude='node_modules' --exclude='storage' --exclude='.claude' \
  --exclude='bootstrap/cache' \
  backend/ $SERVER:/opt/pwa13/backend/

echo ""
echo "=== 3/4 Синхронизация фронтенда ==="
eval $RSYNC --delete frontend/dist/ $SERVER:/var/www/app.gaub.ru/

echo ""
echo "=== 4/4 Миграции и кэши ==="
eval $SSH "cd /opt/pwa13 && $COMPOSE exec app php artisan migrate --force 2>&1"
eval $SSH "cd /opt/pwa13 && $COMPOSE exec app php artisan config:cache 2>&1"
eval $SSH "cd /opt/pwa13 && $COMPOSE exec app php artisan route:cache 2>&1"

echo ""
echo "=== Деплой завершён ==="
echo "https://app.gaub.ru"
