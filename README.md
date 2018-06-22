## Dev
Use this configuration for rapid development inside of Docker:

    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

This mounts `client/dist` and `server/src` inside the Node container and runs Nodemon.
However, you'll need to run `ng build --watch` for the client outside of Docker yourself.
(And, therefore, `npm install` there as well.)

Additionally, a mongo-express container is provided for database debugging.
This container is available at `http://localhost:8282/`.


## Production
Docker Cloud is currently automatically building images from `master`, so deploying
RPNow just requires `docker-compose.yml` and a `Caddyfile`. Use `Caddyfile.prod`, but rename it to just `Caddyfile`. Put that in a directory and run:

    docker stack deploy --compose-file=docker-compose.yml rpnow

This will create or update the rpnow stack.
