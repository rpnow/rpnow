#!/bin/sh

# Empty dist folder
rm -rf dist/*
mkdir dist
mkdir dist/common

# Get native sqlite3 bindings for all platforms, and copy them in
npx node-pre-gyp install --directory ./node_modules/sqlite3 --target=10.15.1 --target_platform=win32 --target_arch=ia32
npx node-pre-gyp install --directory ./node_modules/sqlite3 --target=10.15.1 --target_platform=linux --target_arch=x64

mkdir -p ./dist/win32/node_modules/sqlite3/lib/binding/node-v64-win32-ia32
mkdir -p ./dist/linux/node_modules/sqlite3/lib/binding/node-v64-linux-x64
cp ./node_modules/sqlite3/lib/binding/node-v64-win32-ia32/node_sqlite3.node ./dist/win32/node_modules/sqlite3/lib/binding/node-v64-win32-ia32/node_sqlite3.node
cp ./node_modules/sqlite3/lib/binding/node-v64-linux-x64/node_sqlite3.node ./dist/linux/node_modules/sqlite3/lib/binding/node-v64-linux-x64/node_sqlite3.node

# Remove ursa-optional, which is an (obviously) optional package that
# cannot be bundled up properly into pkg, and breaks things when we try
# (This step can be removed when ursa-optional is no longer installed
# as a dependency of greenlock-express)
rm -rf node_modules/ursa-optional

# Copy in sample rpnow.ini
cp rpnow.ini dist/common

# Copy in src/views
mkdir dist/common/src
cp -r src/views dist/common/src/views
cp -r src/static dist/common/src/static

# Copy common files to all builds
cp -r dist/common/* dist/win32
cp -r dist/common/* dist/linux

# Build exe files
npx nexe src/index.js -t windows-x86-10.15.1 -r src/views -r src/static -r node_modules/sqlite3 -r node_modules/knex -r node_modules/vue-pronto -o dist/win32/RPNow.exe
npx nexe src/index.js -t linux-x64-10.15.1 -r src/views -r src/static -r node_modules/sqlite3 -r node_modules/knex -r node_modules/vue-pronto -o dist/linux/rpnow

# Zip up the windows version
cd dist/win32
zip -r rpnow-windows.zip RPNow.exe rpnow.ini src node_modules/sqlite3/lib/binding/node-v64-win32-ia32/node_sqlite3.node
cd ../..

# Use makeself (apt install makeself) to build the self-extracting linux executable
makeself dist/linux dist/linux/rpnow.sh "RPNow" ./rpnow

# Clean up dist folder
mv dist/win32/rpnow-windows.zip dist
mv dist/linux/rpnow.sh dist
rm -rf dist/win32 dist/linux dist/common
