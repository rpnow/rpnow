# Builder image
FROM alpine:3.9 AS builder

RUN apk add --no-cache alpine-sdk bash go nodejs npm

WORKDIR /usr/src/app

COPY . .
RUN make

# Final image
FROM alpine:3.9

COPY --from=builder /usr/src/app/rpnow-linux.tar.gz /tmp/rpnow.tar.gz

RUN apk add --no-cache tini bash shadow libcap \
    && mkdir /tmp/rpnow \
    && tar -xvzf /tmp/rpnow.tar.gz -C /tmp/rpnow/ \
    && /tmp/rpnow/install.sh \
    && rm -r /tmp/rpnow /tmp/rpnow.tar.gz \
    && apk del --no-cache bash shadow libpcap

USER rpnow
WORKDIR /usr/local/rpnow
EXPOSE 80 443
ENTRYPOINT ["tini", "--"]
CMD ["/usr/local/bin/rpnow", "server"]
