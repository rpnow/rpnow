<?php
require 'vendor/autoload.php';
// Create and configure Slim app
$config = ['settings' => [
    'addContentLengthHeader' => false,
    'displayErrorDetails' => true
]];
$app = new \Slim\App($config);

// Dependencies
require_once './api/db.php';

// Define app routes
require_once './api/admin.php';
require_once './api/rest.php';
require_once './api/stream.php';

// Run app
$app->run();
