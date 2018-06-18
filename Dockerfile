# Build frontend
FROM node:8 as builder

WORKDIR /root/client

COPY ./client/package.json .
COPY ./client/package-lock.json .
RUN npm install
COPY ./client/bower.json .
RUN npm run bower

COPY ./client/gulpfile.js .
COPY ./client/app ./app
RUN npx gulp -- build-prod

# Backend
FROM node:8

WORKDIR /root/server

COPY ./server/package.json .
COPY ./server/package-lock.json .
RUN npm install

COPY ./server/src ./src
COPY --from=builder /root/client/dist ../client/dist

CMD npm start
