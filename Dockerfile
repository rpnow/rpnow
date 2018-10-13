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

# Due to a bug in Angular (at least in verison 6) the bundles are different when generated
# without source maps
# However, we want to be able to upload sourcemaps to sentry.io. So we generate the bundle
# with maps and then remove the maps.
RUN npm run build \
    && rm ./dist/rpnow/*.map

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
