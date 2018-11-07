#!/bin/sh
FIFOS=$(ls /tmp/rpnow-fifos/fifo_room_${1:-abc}_*)
if [ "$FIFOS" ]; then
    timeout 1 tee $FIFOS 1>/dev/null
fi