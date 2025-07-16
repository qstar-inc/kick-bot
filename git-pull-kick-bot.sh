#!/usr/bin/bash

cd /home/projects/kick-bot/
echo "Discarding local changes"
git reset --hard
echo "Trying to pull origin main"
git pull origin main
echo "Pull successful"
echo "do docker buildx build -t qstar-inc/kick-bot:1.X ."