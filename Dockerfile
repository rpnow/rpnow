# Build frontend
FROM node:8 as builder

WORKDIR /root/client

COPY ./client/package.json .
COPY ./client/package-lock.json .
RUN npm install

COPY ./client/angular.json .
COPY ./client/ngsw-config.json .
COPY ./client/tsconfig.json .
COPY ./client/src ./src
RUN npx ng build --prod

# Backend
FROM node:8

WORKDIR /root/server

COPY ./server/package.json .
COPY ./server/package-lock.json .
RUN npm install

COPY ./server/src ./src
COPY ./server/admin ./admin
COPY --from=builder /root/client/dist ../client/dist

CMD npm start
