# RPNow
The Dead-Simple Roleplay Chatroom Service. [beta.rpnow.net](http://beta.rpnow.net/)


## What is this?
Originally a passion project created for my own use in 2015, __RPNow__ has since become a popular platform for roleplaying and storytelling internationally. As of May 2018, it has delivered __14 million messages__ between __100 thousand users.__

This is the second iteration of the site, which is currently still in beta. It will eventually replace the current stable version, whose repository [is available here](https://github.com/rpnow/rpnow).

Hosting for RPNow is entirely supported by user donations. Please consider [donating on Patreon](https://www.patreon.com/rpnow)!


## Requirements
Because RPNow is fully dockerized, the only requirements are Docker and Docker-compose.

Tested on Ubuntu 16.04 using Docker 17 and Docker-compose 1.9.


## Installing
A convenience script is provided for quickly installing vendor components within the repository.

    ./install.sh


## Running
To start RPNow, use docker-compose:

    docker-compose up -d

The `-d` flag runs `docker-compose` in detached mode, freeing up the terminal. You may leave
it out if you don't want that behavior.

Once the "build" container has exited, open `http://localhost:8080/` in your browser.

To stop the containers, use:

    docker-compose down

To view the log output of the containers, use:

    docker-compose logs


### Admin tools
An alternate command to enable the mongo-express admin container:

    docker-compose -f docker-compose.yml -f docker-compose.admin.yml up -d

This container is available at `http://localhost:8282/`.


### Environment variables
Modify the behavior of RPNow by changing variables in the `.env` file, or by changing your
actual environment variables.

Keep in mind that depending on your OS, you may need elevated priviliges to run on port 80.


## Testing
Currently, only the API server has unit tests. To run these, use the following command:

    docker-compose run --rm api npm test

