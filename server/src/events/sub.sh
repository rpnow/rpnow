#!/bin/sh

ROOM=${1:-abc}
FILE=./fifo_room_${ROOM}_$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32)

mkfifo $FILE
trap "rm -f $FILE" 0
trap "exit 1" HUP INT QUIT PIPE TERM
tail -f $FILE
