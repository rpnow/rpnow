SHELL := /bin/bash # for pushd/popd

.PHONY: default
default: rpnow-linux.tar.gz rpnow-windows.zip

.PHONY: clean
clean:
	rm -rf rpnow-linux.tar.gz rpnow server/frontend/assets_bundle.go views/dist views/node_modules

rpnow-windows.zip: rpnow.exe
	zip rpnow-windows.zip rpnow.exe

rpnow-linux.tar.gz: rpnow install.sh
	tar -cvzf rpnow-linux.tar.gz rpnow install.sh

rpnow.exe: server/frontend/assets_bundle.go $(shell find server)
	pushd server >/dev/null && \
	GOOS=windows GOARCH=386 go build -o ../rpnow.exe && \
	popd >/dev/null

rpnow: server/frontend/assets_bundle.go $(shell find server)
	pushd server >/dev/null && \
	go build -o ../rpnow && \
	popd >/dev/null

server/frontend/assets_bundle.go: views/dist
	pushd server >/dev/null && \
	go generate && \
	popd >/dev/null

views/dist: views/node_modules $(shell find views/src) $(shell find views/public)
	pushd views >/dev/null && \
	npm run build && \
	popd >/dev/null

views/node_modules: views/package.json
	pushd views >/dev/null && \
	npm install && \
	popd >/dev/null
