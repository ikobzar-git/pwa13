#!/bin/bash
# Прямой SQL-запрос к продакшен-базе через SSH + docker exec
# Использование: ./db.sh "SELECT * FROM users LIMIT 5"

QUERY="$1"
if [ -z "$QUERY" ]; then
  echo "Использование: ./db.sh \"SELECT * FROM users LIMIT 5\""
  exit 1
fi

sshpass -p 'Voc3eqvSeM%Q' ssh -o StrictHostKeyChecking=no -o PubkeyAuthentication=no \
  root@90.156.253.143 \
  "docker exec pwa13-prod-postgres psql -U pwa13 -d pwa13_db -c \"$QUERY\""
