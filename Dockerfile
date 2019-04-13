FROM alpine:3.9 AS builder

RUN apk add --no-cache tini make bash go
RUN apk add --no-cache git
RUN apk add --no-cache linux-headers
# TODO no alpine sdk please, reduce what's here?
RUN apk add --no-cache alpine-sdk
RUN apk add --no-cache nodejs npm

WORKDIR /usr/src/app

COPY . .
RUN make

FROM alpine:3.9

RUN apk add --no-cache tini bash shadow libcap

COPY --from=builder /usr/src/app/rpnow-linux.tar.gz /tmp/rpnow.tar.gz

RUN mkdir /tmp/rpnow \
    && tar -xvzf /tmp/rpnow.tar.gz -C /tmp/rpnow/ \
    && /tmp/rpnow/install.sh \
    && rm -r /tmp/rpnow /tmp/rpnow.tar.gz

EXPOSE 80 443

USER rpnow
WORKDIR /usr/local/rpnow
ENTRYPOINT ["tini", "--"]
CMD ["/usr/local/rpnow/rpnow"]
