<?php
require 'vendor/autoload.php';
// Create and configure Slim app
$config = ['settings' => [
    'addContentLengthHeader' => false,
    'displayErrorDetails' => true,
    'db' => [
        'driver' => 'mysql',
        'prefix' => '',
        'host' => 'localhost',
        'database' => 'rpnow',
        'username' => 'nigel',
        'password' => 'abc123'
    ]
]];
$app = new \Slim\App($config);

// Dependencies
require_once './src/db.php';
require_once './src/stream.php';
require_once './src/validate.php';
require_once './src/pubsub.php';

// Define app routes
require_once './src/rest.php';

// Frontend
// TODO X-Robots-Tag
$app->get('/', function ($request, $response, $args) {
    return $response->write(file_get_contents('./client-files/index.html'));
});
$app->get('/terms', function ($request, $response, $args) {
    return $response->write(file_get_contents('./client-files/index.html'));
});
$app->get('/rp/demo', function ($request, $response, $args) {
    return $response->write(file_get_contents('./client-files/index.html'));
});
$app->get('/rp/{rpRoute:.*}', function ($request, $response, $args) {
    return $response->write(file_get_contents('./client-files/index.html'));
});
$app->get('{badRoute:.*}', function ($request, $response, $args) {
    return $response->withStatus(404)->write(file_get_contents('./client-files/index.html'));
});

// Run app
$app->run();
