# Build frontend
FROM node:8 as builder

WORKDIR /root/client

COPY ./client/package.json .
COPY ./client/package-lock.json .
RUN npm install --production

COPY ./client/angular.json .
COPY ./client/ngsw-config.json .
COPY ./client/tsconfig.json .
COPY ./client/src ./src

RUN npm run build

# Delete this old ngsw because it might cause bugs if it's loaded on accident,
# see ngsw-worker-polyfilled for more info
RUN rm ./dist/rpnow/ngsw-worker.js

# compress all non-mp3 files using gzip, then rename them back without the .gz extension
RUN find ./dist/rpnow -type f -not -name "*.mp3" -exec gzip "{}" \; -exec mv "{}.gz" "{}" \;

# Backend
FROM node:8

WORKDIR /root/server

COPY ./server/package.json .
COPY ./server/package-lock.json .
RUN npm install --production

COPY ./server/src ./src
COPY ./server/admin ./admin
COPY --from=builder /root/client/dist ../client/dist

ENV RPNOW_PORT 3000
ENV RPNOW_BUNDLE_COMPRESSION gzip
EXPOSE ${RPNOW_PORT}

CMD ["node", "src/index.js"]
