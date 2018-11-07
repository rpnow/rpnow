<?php

$app->group('/api', function() {
    $this->post('/rp.json', function ($request, $response, $args) {
        // validate {title}
        // Insert doc in (namespace, 'meta', {title}, ip)
        // Insert doc in ('urls', rpCode, {namespace}, ip)
        // return rpCode
        return $response->withJson(['foo' => 'bar'], 200);
    });
    $this->get('/challenge.json', function ($request, $response, $args) {
        // generate this magically
        // return {secret, hash}
        return $response->withJson(['foo' => 'bar'], 200);
    });
    $this->group('/rp/{rpCode:[-0-9a-zA-Z]+}', function() {
        $this->get('/', function ($request, $response, $args) {
            // begin TX
            // Get meta
            // Get msgs limit 60 desc
            // Get charas
            // Get max event_id in database
            // end TX
            // obfuscate ip's
            // return all
            return $response->withJson(['rpCode' => $args['rpCode']], 200);
        });
        $this->get('/page/{pageNum:[1-9][0-9]*}', function ($request, $response, $args) {
            // Get meta
            // Get msgs skip x*20 limit 20
            // Get charas
            // Get Math.ceil(msgCount/20)
            // obfuscate ip's
            // return all
            return $response->withJson(['rpCode' => $args['rpCode']], 200);
        });
        $this->get('/download.txt', function ($request, $response, $args) {
            // Get meta
            // Get msgs
            // Get charas
            // print title
            // print all msgs
            return $response->withJson(['rpCode' => $args['rpCode']], 200);
        });
        $this->put('/message', function ($request, $response, $args) {
            // validate {content, type, charaId, secret, hash}
            return $response->withJson(['rpCode' => $args['rpCode']], 200);
        });
        $this->put('/image', function ($request, $response, $args) {
            // validate {url, secret, hash}
            return $response->withJson(['rpCode' => $args['rpCode']], 200);
        });
        $this->put('/chara', function ($request, $response, $args) {
            // validate {name, color, secret, hash}
            return $response->withJson(['rpCode' => $args['rpCode']], 200);
        });
    });
});
