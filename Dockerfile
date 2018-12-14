FROM node:8 as builder

WORKDIR /root/

COPY ./old-angular-client/ ./old-angular-client/
COPY ./src/ ./src/
COPY ./.eslintrc.json .
COPY ./build.sh .
COPY ./jasmine.json .
COPY ./package-lock.json .
COPY ./package.json .

EXPOSE 13000

RUN npm install

CMD ["node", "src/index.js"]
