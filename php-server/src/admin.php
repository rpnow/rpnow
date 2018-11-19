<?php

// TODO better UI for initializing database, and more obvious errors if it's not initalized
$app->group('/admin', function() {
    $this->get('/setup', function ($request, $response, $args) {
        $this->get('docs')->initializeDb();
        return $response->withJson(['ok'], 200);
    });
});