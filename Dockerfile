FROM node:8

WORKDIR /root/server

COPY ./server/package.json .
COPY ./server/package-lock.json .
RUN npm install --production

COPY ./server/src ./src
COPY ./server/admin ./admin
COPY ./client/dist ../client/dist

ENV RPNOW_PORT 3000
ENV RPNOW_BUNDLE_COMPRESSION gzip
EXPOSE ${RPNOW_PORT}

CMD ["node", "src/index.js"]
