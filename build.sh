#!/bin/sh

TEMPDIR=$(mktemp -d)
BUILDDIR=$TEMPDIR/rpnow-server-contents
mkdir $BUILDDIR

cp -r ./php-server/src $BUILDDIR/src
cp -r ./php-server/vendor $BUILDDIR/vendor
cp ./php-server/.htaccess $BUILDDIR
cp ./php-server/index.php $BUILDDIR
cp -r ./client/dist/rpnow $BUILDDIR/client-files
mkdir $BUILDDIR/data

cd $TEMPDIR
zip -r rpnow-server-contents.zip rpnow-server-contents

cd -
cp $TEMPDIR/rpnow-server-contents.zip .
rm -rf $TEMPDIR