<?php
require 'vendor/autoload.php';
// Create and configure Slim app
$config = ['settings' => [
    'addContentLengthHeader' => false,
    'displayErrorDetails' => true,
    'db' => [
        'driver' => 'sqlite',
        'database' => '/tmp/db.sqlite3',
        'prefix' => ''
    ]
]];
$app = new \Slim\App($config);

// CORS
// TODO remove this for prod
$app->add(function ($req, $res, $next) {
    $response = $next($req, $res);
    return $response
            ->withHeader('Access-Control-Allow-Origin', 'http://localhost:4200')
            ->withHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Origin, Authorization')
            ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
});

// Dependencies
require_once './api/db.php';

// Define app routes
require_once './api/admin.php';
require_once './api/rest.php';
require_once './api/stream.php';

// Frontend
// TODO X-Robots-Tag
$app->get('/', function ($request, $response, $args) {
    return $response->write(file_get_contents('./static/index.html'));
});
$app->get('/terms', function ($request, $response, $args) {
    return $response->write(file_get_contents('./static/index.html'));
});
$app->get('/rp/demo', function ($request, $response, $args) {
    return $response->write(file_get_contents('./static/index.html'));
});
$app->get('/rp/{rpRoute:.*}', function ($request, $response, $args) {
    return $response->write(file_get_contents('./static/index.html'));
});
$app->get('{badRoute:.*}', function ($request, $response, $args) {
    return $response->withStatus(404)->write(file_get_contents('./static/index.html'));
});

// Run app
$app->run();
