<?php

$app->group('/api', function() {
    $this->get('/{name}', function ($request, $response, $args) {
        return $response->write("Hello " . $args['name']);
        return $response->withStatus(200);
    });
});
