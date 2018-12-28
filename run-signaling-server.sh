#!/usr/bin/env bash
docker run -p 3000:3000 glasnostic/video-signaling:latest --ws_uri ws://host.docker.internal:8888/kurento