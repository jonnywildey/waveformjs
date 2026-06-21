#!/bin/bash
set -e
cd "$(dirname "$0")/releases"
IP=$(ipconfig getifaddr en0)
echo "Local:   http://localhost:8080"
echo "Network: http://$IP:8080"
python3 -m http.server 8080 &
open "http://localhost:8080/index.html"
wait
