#!/bin/sh

rm -rf dist
mkdir dist

npx node-pre-gyp install --directory ./node_modules/sqlite3 --target_platform=win32 --target_arch=x64
npx node-pre-gyp install --directory ./node_modules/sqlite3 --target_platform=win32 --target_arch=ia32
npx node-pre-gyp install --directory ./node_modules/sqlite3 --target_platform=darwin --target_arch=x64
npx node-pre-gyp install --directory ./node_modules/sqlite3 --target_platform=linux --target_arch=x64

mkdir -p ./dist/node_modules/sqlite3/lib
cp -r ./node_modules/sqlite3/lib/binding ./dist/node_modules/sqlite3/lib/binding

cp -r src/static dist/static
cp -r src/views dist/views

npx pkg ./package.json -t node8-win-x64,node8-win-x86,node8-darwin-x64,node8-linux-x64 --out-path dist

cd dist
zip -r rpnow-win-x64.zip rpnow-win-x64.exe static views node_modules/sqlite3/lib/binding/node-v57-win32-x64/node_sqlite3.node
zip -r rpnow-win-x86.zip rpnow-win-x86.exe static views node_modules/sqlite3/lib/binding/node-v57-win32-ia32/node_sqlite3.node
zip -r rpnow-macos-x64.zip rpnow-macos-x64 static views node_modules/sqlite3/lib/binding/node-v57-darwin-x64/node_sqlite3.node
zip -r rpnow-linux-x64.zip rpnow-linux-x64 static views node_modules/sqlite3/lib/binding/node-v57-linux-x64/node_sqlite3.node

rm -rf node_modules
rm -rf static
rm -rf views
find . -type f ! -name '*.zip' -delete
