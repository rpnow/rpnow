#!/bin/sh
docker-compose run --rm api npm install

docker-compose run --rm web_build npm install --unsafe-perm
