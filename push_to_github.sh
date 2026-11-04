#!/bin/bash
set -e

cd "/Users/henrymaxfleminger/Downloads/Achtung, die Kurve!"

git init
git add .
git commit -m "Initial game files"
git branch -M main
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/HarryFleminger/achtung-multiplayer.git
git push -u origin main
