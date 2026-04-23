#!/usr/bin/bash

cd /home/projects/kick-bot/

echo "Discarding local changes"
git reset --hard

echo "Pulling latest"
git pull origin main
echo "Pull successful"

VERSION=$(node -p "require('./package.json').version")

# echo "do docker buildx build -t qstar-inc/kick-bot:1.X ."
echo "Building Docker image"
docker build -t qstar-inc/kick-bot:$VERSION .

echo "Restarting container"
docker stop kick-bot || true
docker rm kick-bot || true
docker run -d --name --env-file .env kick-bot qstar-inc/kick-bot:$VERSION