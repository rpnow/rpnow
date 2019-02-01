#!/bin/sh

# Exit on error
set -e

# Check node version
node -p "require('assert').ok(process.versions.node.split('.')[0] == '10', 'Node version must be ^10.12.0')"
node -p "require('assert').ok(process.versions.node.split('.')[1] >= '12', 'Node version must be ^10.12.0')"

# Clean dist folder
rm -rf dist
mkdir dist

# Get native sqlite3 bindings for all platforms, and copy them in
npx node-pre-gyp install --directory ./node_modules/sqlite3 --target_platform=win32 --target_arch=ia32
npx node-pre-gyp install --directory ./node_modules/sqlite3 --target_platform=linux --target_arch=x64

mkdir -p ./dist/node_modules/sqlite3/lib
cp -r ./node_modules/sqlite3/lib/binding ./dist/node_modules/sqlite3/lib/binding

# Remove ursa-optional, which is an (obviously) optional package that
# cannot be bundled up properly into pkg, and breaks things when we try
# (This step can be removed when ursa-optional is no longer installed
# as a dependency of greenlock-express)
rm -rf node_modules/ursa-optional

# Copy in sample rpnow.ini
cp ./rpnow.ini ./dist

# Build exe files
npx pkg ./package.json --targets node8-win-x86 --output dist/RPNow.exe
npx pkg ./package.json --targets node8-linux-x64 --output dist/rpnow

# Zip up the distributables
cd dist
zip rpnow-windows.zip RPNow.exe rpnow.ini node_modules/sqlite3/lib/binding/node-v57-win32-ia32/node_sqlite3.node
zip rpnow-linux.zip rpnow rpnow.ini node_modules/sqlite3/lib/binding/node-v57-linux-x64/node_sqlite3.node

# Clean up dist folder
rm -rf node_modules
find . -type f ! -name '*.zip' -delete
