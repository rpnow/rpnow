FROM debian:buster-slim

RUN apt-get update && apt-get install -y curl libcap2-bin tini

COPY ./install.sh /tmp/
RUN /tmp/install.sh

EXPOSE 80 443

USER rpnow
WORKDIR /usr/local/rpnow
ENTRYPOINT ["tini", "--"]
CMD ["/usr/local/rpnow/rpnow"]
