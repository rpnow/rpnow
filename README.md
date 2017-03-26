# RPNow
The Dead-Simple Roleplay Chatroom Service. http://beta.rpnow.net/


## Requirements
Because RPNow is fully dockerized, the only requirements are Docker and Docker-compose.

Tested on Ubuntu 16.04 using Docker 17 and Docker-compose 1.9.


## Installing
Clone this repository to your local machine.


## Running
RPNow can be run in two distinct modes: development and production.

### Dev mode
To run RPNow in development mode, enter the repository folder and use the following command:

    docker-compose up

Once the "build" container has finished running the 'default' gulp task, open `http://localhost:8080/` in your browser.

To stop the dev containers, send an interrupt (press Ctrl+C) from the terminal that `docker-compose` is running in.


### Production mode
In a production environment, use the following command to run RPNow:

    docker-compose -f docker-compose.yml -f docker-compose.production.override.yml up -d

Because production mode runs the web server on port 80, you may need elevated privileges to run in production mode. (`sudo` works fine.)

The `-d` flag runs `docker-compose` in detached mode, freeing up the terminal. You may leave it out if you don't want that behavior.

To view the log output of the containers in detached mode, use:

    docker-compose logs

To stop all production containers, use:

    docker-compose down


## Debugging
When running in dev mode, RPNow provides two additional containers to assist in debugging code.

First, the `web_debug` container, available at `http://localhost:8181/`, serves all the static frontend files for RPNow, without doing any custom routing.

Second, the `db_debug` container, available at `http://localhost:8282/`, provides the MongoDB admin web interface, Mongo-Express.

These debugging containers are not created when in production mode.


## Testing
Currently, only the API server has unit tests. To run these, use the following command:

    docker-compose -f docker-compose.tests.yml up --abort-on-container-exit

