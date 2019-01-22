#!/bin/sh

rm -rf dist
mkdir dist

npx node-pre-gyp install --directory ./node_modules/sqlite3 --target_platform=win32 --target_arch=ia32

mkdir -p ./dist/node_modules/sqlite3/lib
cp -r ./node_modules/sqlite3/lib/binding ./dist/node_modules/sqlite3/lib/binding

npx pkg ./package.json --targets node8-win-x86 --output dist/RPNow.exe

cd dist
zip RPNow.zip RPNow.exe node_modules/sqlite3/lib/binding/node-v57-win32-ia32/node_sqlite3.node

rm -rf node_modules
find . -type f ! -name '*.zip' -delete
