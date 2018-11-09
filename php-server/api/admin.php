<?php

$app->group('/admin', function() {
    $this->get('/setup', function ($request, $response, $args) {
        $this->get('docs')->initializeDb();
        return $response->withJson(['ok'], 200);
    });
});