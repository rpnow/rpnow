FROM node:4
WORKDIR /root
ADD . .
RUN npm install
ENV IP=0.0.0.0
ENV PORT=80
EXPOSE 80
CMD npm start
