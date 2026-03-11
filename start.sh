#!/bin/bash
# Démarrage de l'application Activités Jeunesse

echo "🎯 Démarrage Activités Jeunesse..."

# Trouver l'IP locale
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")
PORT=3001

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Site public   : http://$IP:$PORT"
echo "  Admin         : http://$IP:$PORT/admin"
echo "  Login admin   : admin / activites2024"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Partagez cette URL ou générez un QR code sur votre réseau local."
echo ""

cd "$(dirname "$0")/backend" && node index.js
