SHELL := /bin/bash # for pushd/popd

.PHONY: default
default: rpnow-linux.tar.gz rpnow-windows.zip

.PHONY: clean
clean:
	rm -rf rpnow-linux.tar.gz rpnow server/www views/node_modules

rpnow-windows.zip: rpnow.exe RPData
	zip -r rpnow-windows.zip rpnow.exe RPData

RPData:
	mkdir RPData

rpnow-linux.tar.gz: rpnow install.sh
	tar -cvzf rpnow-linux.tar.gz rpnow install.sh

rpnow.exe: server/www $(shell find server)
	pushd server >/dev/null && \
	GOOS=windows GOARCH=386 go build -o ../rpnow.exe && \
	popd >/dev/null

rpnow: server/www $(shell find server)
	pushd server >/dev/null && \
	go build -o ../rpnow && \
	popd >/dev/null

server/www: views/node_modules $(shell find views/src) $(shell find views/public)
	pushd views >/dev/null && \
	npm run build && \
	popd >/dev/null

views/node_modules: views/package.json
	pushd views >/dev/null && \
	npm install && \
	popd >/dev/null
