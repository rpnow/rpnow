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

Once the "build" container has finished running gulp tasks, open `http://localhost:8080/` in your browser.


### Production mode
In a production environment, use the following command to run RPNow:

    docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d

Because production mode runs the web server on port 80, you may need elevated privileges. (`sudo` works fine.) The `-d` flag runs docker-compose in detached mode, freeing up the console. You may leave it out if you don't want that behavior.

To view the log output of the containers in detached mode, use:

    docker-compose logs


## Testing
`// TODO: dockerize unit tests`
