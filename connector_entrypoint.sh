#!/bin/bash

# Start socat loop in the background
(
  while true; do
    echo "[INFO] Starting socat..."
    socat -d -d PTY,link=/tmp/ttyMOXA1,raw TCP:89.22.215.52:950
    echo "[WARN] socat exited. Sleeping for 1 minute before retry..."
    sleep 60
  done
) &

# Start Node.js app in the foreground (main process)
echo "[INFO] Starting Node.js app..."
node apps/connector/dist/index.js
