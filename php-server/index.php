<?php
// Load libraries
require 'vendor/autoload.php';

// Create and configure Slim app
$config = [
    'settings' => [
        // TODO add this back if we end up using stream api
        // 'addContentLengthHeader' => false,

        'displayErrorDetails' => true,

        'db' => require './db-settings.php'
    ]
];
$app = new \Slim\App($config);

// Dependency injection
require_once './src/db.php';
require_once './src/validate.php';

// App API
require_once './src/rest.php';

// Frontend
require_once './src/frontend-routes.php';

// Run app
$app->run();
