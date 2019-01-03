#!/usr/bin/env bash
set -e

DATE=$(date +%Y%m%d)
docker build . -t glasnostic/video-signaling
docker tag glasnostic/video-signaling glasnostic/video-signaling:$DATE

echo
echo "Signaling server successfully built. To push to docker hub call:"
echo "$ docker push glasnostic/video-signaling:$DATE"
