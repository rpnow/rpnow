<?php

$app->group('/api', function() {
    $this->post('/rp.json', function ($request, $response, $args) {
        // validate {title}
        // Insert doc in (namespace, 'meta', {title}, ip)
        // Insert doc in ('urls', rpCode, {namespace}, ip)
        // return rpCode
        return $response->withJson(['rpCode' => 'abc'], 201);
    });
    $this->get('/challenge.json', function ($request, $response, $args) {
        // generate this magically
        // return {secret, hash}
        return $response->withJson([
            "secret" => "701021d9d39286c9c19b5c65504b8393230811f9c1a814232bdb29bd90b83e9e",
            "hash" => "f82fa215887270cbfcd3d677fe7044db66b0a49f51248873863969617f45b1a1041abd047cff837904b8b848439be0287c358c193c90440a0e9b9790e2051159"
        ], 200);
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
