#!/bin/bash
# SSH-туннель к продакшен-базе PostgreSQL
# Пробрасывает удалённый 127.0.0.1:15432 на локальный localhost:15432
# Используется MCP-сервером PostgreSQL для прямого доступа к БД

echo "Открываю SSH-туннель к PostgreSQL (localhost:15432 → сервер:15432)..."
echo "Для остановки: Ctrl+C"
sshpass -p 'Voc3eqvSeM%Q' ssh -o StrictHostKeyChecking=no -o PubkeyAuthentication=no \
  -N -L 15432:127.0.0.1:15432 root@90.156.253.143
