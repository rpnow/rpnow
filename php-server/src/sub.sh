#!/bin/sh

mkdir -p /tmp/rpnow-fifos

ROOM=${1:-abc}
FILE=/tmp/rpnow-fifos/fifo_room_${ROOM}_$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32)

mkfifo $FILE
trap "rm -f $FILE" 0
trap "exit 1" HUP INT QUIT PIPE TERM
timeout 20 tail -f $FILE
