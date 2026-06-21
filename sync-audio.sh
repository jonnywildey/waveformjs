#!/bin/bash
set -e

BUCKET="alphabetsheaven"
REMOTE_PATH="audio"
LOCAL_PATH="$(dirname "$0")/audio"

rclone sync "$LOCAL_PATH" "r2:$BUCKET/$REMOTE_PATH" \
  --exclude ".DS_Store" \
  --exclude "**/.DS_Store" \
  --progress \
  --transfers 4

echo "Done. Files available at:"
echo "https://pub-<your-public-url>.r2.dev/$REMOTE_PATH/"
