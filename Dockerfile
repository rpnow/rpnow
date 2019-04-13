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

RUN apk add --no-cache tini

COPY --from=builder /usr/src/app/rpadmin /usr/local/bin/rpadmin
COPY --from=builder /usr/src/app/rpnow /usr/local/rpnow/rpnow

EXPOSE 80 443

# USER rpnow
# WORKDIR /usr/local/rpnow
ENTRYPOINT ["tini", "--"]
CMD ["/usr/local/rpnow/rpnow"]
