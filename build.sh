#!/bin/sh

TEMPDIR=$(mktemp -d)

cp -r ./php-server/src $TEMPDIR/src
cp -r ./php-server/vendor $TEMPDIR/vendor
cp ./php-server/.htaccess $TEMPDIR
cp ./php-server/index.php $TEMPDIR
cp -r ./client/dist/rpnow $TEMPDIR/client-files

cd $TEMPDIR
zip -r rpnow-server-contents.zip .

cd -
cp $TEMPDIR/rpnow-server-contents.zip .
