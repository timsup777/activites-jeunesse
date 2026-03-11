#!/bin/bash
echo "📦 Installation des dépendances..."

echo "→ Backend..."
cd "$(dirname "$0")/backend" && npm install

echo "→ Frontend..."
cd "$(dirname "$0")/frontend" && npm install

echo "→ Construction du frontend..."
npm run build

echo ""
echo "✅ Installation terminée !"
echo "Lancez ./start.sh pour démarrer l'application."
