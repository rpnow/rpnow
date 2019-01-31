#!/bin/sh

rm -rf dist
mkdir dist

npx node-pre-gyp install --directory ./node_modules/sqlite3 --target_platform=win32 --target_arch=ia32
npx node-pre-gyp install --directory ./node_modules/sqlite3 --target_platform=linux --target_arch=x64

mkdir -p ./dist/node_modules/sqlite3/lib
cp -r ./node_modules/sqlite3/lib/binding ./dist/node_modules/sqlite3/lib/binding
cp ./rpnow.ini ./dist

npx pkg ./package.json --targets node8-win-x86 --output dist/RPNow.exe
npx pkg ./package.json --targets node8-linux-x64 --output dist/rpnow

cd dist
zip rpnow-windows.zip RPNow.exe rpnow.ini node_modules/sqlite3/lib/binding/node-v57-win32-ia32/node_sqlite3.node
zip rpnow-linux.zip rpnow rpnow.ini node_modules/sqlite3/lib/binding/node-v57-linux-x64/node_sqlite3.node

rm -rf node_modules
find . -type f ! -name '*.zip' -delete
