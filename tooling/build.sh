#!/bin/bash

# Clean dist folder
rm -rf dist/*
mkdir -p dist

# Build admin-cli tool
pushd admin-cli
go build -o ../dist/rpadmin .
popd

# Get native sqlite3 bindings for all platforms, and copy them in
npx node-pre-gyp install --directory ./node_modules/sqlite3 --target=10.15.1 --target_platform=linux --target_arch=x64

mkdir -p ./dist/node_modules/sqlite3/lib
cp -r ./node_modules/sqlite3/lib/binding ./dist/node_modules/sqlite3/lib/binding

# Remove ursa-optional, which is an (obviously) optional package that
# cannot be bundled up properly into pkg, and breaks things when we try
# (This step can be removed when ursa-optional is no longer installed
# as a dependency of greenlock-express)
rm -rf node_modules/ursa-optional

# Copy in sample rpnow.ini
cp ./tooling/rpnow.ini ./dist

# Copy in src/views
mkdir -p ./dist/src
cp -r src/views dist/src/views
cp -r src/static dist/src/static

# Build exe files
npx nexe src/index.js -t linux-x64-10.15.1 -r src/views -r src/static -r node_modules/sqlite3 -r node_modules/knex -r node_modules/vue-pronto -o dist/rpnow

# Zip up the distributables
cd dist
tar -cvzf rpnow-linux.tar.gz rpnow rpnow.ini src node_modules/sqlite3/lib/binding/node-v64-linux-x64/node_sqlite3.node

# Clean up dist folder
rm -rf node_modules src rpnow rpnow.ini
