#!/bin/sh
docker build -t rpnow . && docker run -it -p 80:80 rpnow

