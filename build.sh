#!/bin/sh

# Clean dist folder
rm -rf dist/*
mkdir -p dist

# Get native sqlite3 bindings for all platforms, and copy them in
npx node-pre-gyp install --directory ./node_modules/sqlite3 --target=10.15.1 --target_platform=win32 --target_arch=ia32
npx node-pre-gyp install --directory ./node_modules/sqlite3 --target=10.15.1 --target_platform=linux --target_arch=x64

mkdir -p ./dist/node_modules/sqlite3/lib
cp -r ./node_modules/sqlite3/lib/binding ./dist/node_modules/sqlite3/lib/binding

# Remove ursa-optional, which is an (obviously) optional package that
# cannot be bundled up properly into pkg, and breaks things when we try
# (This step can be removed when ursa-optional is no longer installed
# as a dependency of greenlock-express)
rm -rf node_modules/ursa-optional

# Copy in sample rpnow.ini
cp ./rpnow.ini ./dist

# Copy in src/views
mkdir -p ./dist/src
cp -r src/views dist/src/views

# Build exe files
npx nexe src/index.js -t linux-x64-10.15.1 -r src/views -r node_modules/sqlite3 -r node_modules/knex -r node_modules/vue-pronto -o dist/rpnow-linux-x64

# Zip up the distributables
# cd dist
# zip -r rpnow-win-x64.zip rpnow-win-x64.exe static views node_modules/sqlite3/lib/binding/node-v57-win32-x64/node_sqlite3.node
# zip -r rpnow-win-x86.zip rpnow-win-x86.exe static views node_modules/sqlite3/lib/binding/node-v57-win32-ia32/node_sqlite3.node
# zip -r rpnow-macos-x64.zip rpnow-macos-x64 static views node_modules/sqlite3/lib/binding/node-v57-darwin-x64/node_sqlite3.node
# zip -r rpnow-linux-x64.zip rpnow-linux-x64 static views node_modules/sqlite3/lib/binding/node-v57-linux-x64/node_sqlite3.node

# Clean up dist folder
# rm -rf node_modules src
# find . -type f ! -name '*.zip' -delete
