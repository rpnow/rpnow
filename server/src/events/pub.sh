#!/bin/sh
FIFOS=$(ls fifo_room_${1:-abc}_*)
if [ "$FIFOS" ]; then
    timeout 1 tee $FIFOS
fi