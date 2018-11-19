<?php

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
