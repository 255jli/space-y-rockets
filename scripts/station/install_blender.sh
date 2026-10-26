#!/usr/bin/env bash
# install_blender.sh — установка Blender 4.4.3 в Ubuntu/Codespaces.
# Идемпотентен: повторный запуск ничего не ломает.
set -euo pipefail

VER="4.4.3"
DIR="blender-${VER}-linux-x64"
TAR="${DIR}.tar.xz"
URL="https://download.blender.org/release/Blender4.4/${TAR}"

echo "=== [1/4] Базовые утилиты ==="
sudo apt-get update -qq
sudo apt-get install -y -qq wget xz-utils

echo "=== [2/4] Системные библиотеки для Blender (headless) ==="
sudo apt-get install -y -qq \
    libxfixes3 libxi6 libxxf86vm1 libxrender1 libxrandr2 \
    libx11-6 libgl1 libegl1 libxkbcommon0 libsm6 libice6 \
    libxcursor1 libxcomposite1 libdbus-1-3

echo "=== [3/4] Скачивание Blender ${VER} ==="
if [ ! -d "$DIR" ]; then
    wget -q --show-progress "$URL"
    tar -xf "$TAR"
    rm -f "$TAR"
else
    echo "  уже распаковано: $DIR"
fi

echo "=== [4/4] Команда 'blender' в PATH ==="
sudo ln -sf "$(pwd)/${DIR}/blender" /usr/local/bin/blender

echo ""
echo "=== Готово ==="
blender --version | head -n 1