FROM alpine

RUN apk add --no-cache bash libcap shadow tini 

COPY ./install.sh /tmp/
RUN /tmp/install.sh

EXPOSE 80 443

# USER rpnow
# ENTRYPOINT ["tini", "--"]
CMD ["/usr/local/rpnow/rpnow"]
