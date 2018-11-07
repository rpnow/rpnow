<?php

$container = $app->getContainer();

$container['db'] = function($c) {
    $db = $c['settings']['db'];
    $pdo = new PDO('sqlite:/tmp/db.sqlite3');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    return $pdo;
};
