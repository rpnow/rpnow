## Dev
Use this configuration for rapid development inside of Docker:

    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

This mounts `client/dist` and `server/src` inside the Node container and runs Nodemon.
However, you'll need to run `ng build --watch` for the client outside of Docker yourself.
(And, therefore, `npm install` there as well.)

Additionally, a mongo-express container is provided for database debugging.
This container is available at `http://localhost:8282/`.


## Testing
While running in dev, run server tests with:

    docker-compose exec rpnow npm test


## Production
Docker Cloud is currently automatically building images from `master`, so deploying
RPNow just requires `docker-compose.yml` and a `Caddyfile`. Use `Caddyfile.prod`, but rename it to just `Caddyfile`. Put that in a directory and run:

    docker stack deploy --compose-file=docker-compose.yml rpnow

This will create the rpnow stack.


### Updating
Usually, you'll just need to update the rpnow image in the production stack. First, pull the new RPNow docker image, which is automatically built
on Docker Cloud. Then, update the `rpnow_rpnow` service with `--force`. (Not sure why force is needed!)

    docker pull rpnow/rpnow
    docker service update --force rpnow_rpnow.

If changes were made to other things, then probably just remove the stack and re-deploy it. Sometimes this can be flakey and needs a few tries...?


## Admin scripts
Like so:

    docker-compose exec rpnow node admin/migrate.js

Or whichever other script you want to run.
