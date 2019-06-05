# Welcome to RPNow!

RPNow is a self-hosted, web-based roleplay chat website.

(TODO: add a GIF here!)

There is currently a canonical instance hosted at [rpnow.net](https://rpnow.net); however, it will be taken down by July 31, 2019. At that point, RPNow will become purely self-hosted software.


# Running RPNow

**For non-technical users who just want to deploy a server, [there is a helpful guide here!](https://docs.google.com/document/d/1wN3TK5f2MDp9_q_U_8H2GknMNxxw8wX2Bk-0OMVbkGU/edit?usp=sharing)**

However, if you're interested in building the project from source, or modifying the server, read on.


## Requirements

* [Node.js 8](https://nodejs.org/en)
* [Go 1.11](https://golang.org/dl/) (1.12 seems to break for some reason)
* [Nodemon](https://nodemon.io/) (optional, but helpful for a pleasant development experience)


## Building

If you have GNU Make installed, then simply open a shell in the project root and run `make`.

Otherwise, you can execute the individual steps manually:

```sh
# Build the web frontend
cd views
npm install
npm run build

# Build the server
cd ../server
go generate
go build -o ../rpnow

# The built server executable will now be at the project root
cd ..
```


## Developing

For a fast and pleasant development experience, it's nice to be able to rebuild and reload the
server every time you change a source file. To do that for RPNow, run these two things:

* **Web Frontend:** Open a shell in the "views" directory. If you haven't already run `npm install`, do that first. Then, run `npm run watch`, which will watch and rebuild the JavaScript.
* **Server Backend:** Open a shell in the "server" directory. Make sure you have installed Nodemon (`npm install --global nodemon`) and then run `nodemon`. This will keep the server running at http://localhost:13000.


# License

[See LICENSE](LICENSE)


# Acknowledgments

![Browserstack](https://i.imgur.com/qPZZGBC.png)  
Cross-browser testing provided by [Browserstack](https://www.browserstack.com/).
