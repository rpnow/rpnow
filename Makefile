SHELL := /bin/bash # for pushd/popd

.PHONY: default
default: rpadmin rpnow

.PHONY: clean
clean:
	rm -r rpadmin rpnow server/assets_bundle.go views/dist views/node_modules

rpadmin:
	pushd admin-cli >/dev/null && \
	go build -o ../rpadmin && \
	popd >/dev/null

rpnow: server/assets_bundle.go
	pushd server >/dev/null && \
	go build -o ../rpnow && \
	popd >/dev/null

server/assets_bundle.go: views/dist
	pushd server >/dev/null && \
	go generate && \
	popd >/dev/null

views/dist: views/node_modules $(shell find views/src) $(shell find views/public)
	pushd views >/dev/null && \
	npm run build && \
	popd >/dev/null

views/node_modules: views/package.json views/package-lock.json
	pushd views >/dev/null && \
	npm install && \
	popd >/dev/null
