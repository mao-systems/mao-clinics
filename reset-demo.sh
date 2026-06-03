#!/bin/bash
# reset-demo.sh — MAO Systems demo reset
#
# Place this file at ~/reset-demo.sh on the EC2 instance:
#   scp reset-demo.sh ubuntu@<EC2-IP>:~/reset-demo.sh
#   ssh ubuntu@<EC2-IP> "chmod +x ~/reset-demo.sh"
#
# Usage: ~/reset-demo.sh
# To reset demo before a client presentation: ~/reset-demo.sh

set -e

echo "🔄 Resetting MAO Systems demo..."
echo ""

read -p "¿Estás seguro? Esto borrará TODOS los datos de la demo. (s/N): " confirm
if [[ "$confirm" != "s" && "$confirm" != "S" ]]; then
  echo "Cancelado."
  exit 0
fi

echo ""
echo "⏳ Iniciando reset..."
echo ""

cd /home/ubuntu/mao-clinics/apps/backend

NODE_ENV=production npx ts-node -r tsconfig-paths/register src/scripts/reset-demo.ts

echo ""
echo "✅ Listo. La demo está limpia para la presentación."
