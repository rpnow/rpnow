<?php

$app->group('/api', function() {
    $this->post('/rp.json', function ($request, $response, $args) {
        return $response->withJson(['foo' => 'bar'], 200);
    });
    $this->post('/challenge.json', function ($request, $response, $args) {
        return $response->withJson(['foo' => 'bar'], 200);
    });
    $this->group('/rp/{rpCode:[-0-9a-zA-Z]+}', function() {
        $this->post('/message', function ($request, $response, $args) {
            return $response->withJson(['rpCode' => $args['rpCode']], 200);
        });
        $this->post('/image', function ($request, $response, $args) {
            return $response->withJson(['rpCode' => $args['rpCode']], 200);
        });
        $this->post('/chara', function ($request, $response, $args) {
            return $response->withJson(['rpCode' => $args['rpCode']], 200);
        });
        $this->patch('/message', function ($request, $response, $args) {
            return $response->withJson(['rpCode' => $args['rpCode']], 200);
        });
        $this->patch('/chara', function ($request, $response, $args) {
            return $response->withJson(['rpCode' => $args['rpCode']], 200);
        });
        $this->get('/page/{pageNum:[1-9][0-9]*}', function ($request, $response, $args) {
            return $response->withJson(['rpCode' => $args['rpCode']], 200);
        });
        $this->get('/download.txt', function ($request, $response, $args) {
            return $response->withJson(['rpCode' => $args['rpCode']], 200);
        });
    });
});
