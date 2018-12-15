FROM node:8-alpine

RUN apk add --no-cache tini

WORKDIR /usr/src/app/

COPY ./package.json ./package-lock.json ./
RUN npm install --production

COPY ./src/ ./src/

ENV NODE_ENV 'production'
ENV RPNOW_PORT ''
ENV RPNOW_TRUST_PROXY ''
ENV RPNOW_CORS ''
ENV RPNOW_LOG_LEVEL ''

RUN mkdir data
VOLUME ./data

EXPOSE 13000

ENTRYPOINT ["tini", "--"]
CMD ["node", "src/index.js"]
