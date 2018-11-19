<?php

$app->group('/api', function() {
    $this->post('/rp.json', function ($request, $response, $args) {
        $Docs = $this->get('docs');
        // TODO implement more secure rpCode generation
        $rpCode = random_int(1000,9999) . '-' . random_int(1000,9999) . '-' . random_int(1000,9999);
        // TODO consider using cuid's for rp namespace generation
        $namespace = 'rp' . random_int(0,999999);
        // TODO get this stuff from post data
        $title = 'My New RP';
        $desc = '';
        // TODO get real IP
        $ip = '1.1.1.1';
        // Insert meta doc for RP
        $Docs->create($namespace, 'meta', 'meta', ['title' => $title, 'desc' => $desc], $ip);
        // Insert doc for URL to refer to RP
        $Docs->create('system', 'urls', $rpCode, ['rp_namespace' => $namespace], $ip);
        // return rpCode
        return $response->withJson(['rpCode' => $rpCode], 201);
    });
    $this->get('/challenge.json', function ($request, $response, $args) {
        // TODO implement challenge/hash mechanism, or get rid of this if it's not needed
        return $response->withJson([
            "secret" => "701021d9d39286c9c19b5c65504b8393230811f9c1a814232bdb29bd90b83e9e",
            "hash" => "f82fa215887270cbfcd3d677fe7044db66b0a49f51248873863969617f45b1a1041abd047cff837904b8b848439be0287c358c193c90440a0e9b9790e2051159"
        ], 200);
    });
    $this->group('/rp/{rpCode:[-0-9a-zA-Z]+}', function() {
        $this->get('', function ($request, $response, $args) {
            $Docs = $this->get('docs');
            // begin TX
            $Docs->transactionStart();
            // Lookup namespace
            $urlDoc = $Docs->doc('system', 'urls', $args['rpCode']);
            $namespace = $urlDoc['body']['rp_namespace'];
            // Get meta
            $meta = $Docs->doc($namespace, 'meta', 'meta');
            // Get msgs limit 60 desc
            $msgs = $Docs->docs($namespace, 'msgs', ['reverse' => 'true', 'limit' => 60])->asArray();
            // TODO msgs will need to be re-reversed back to normal
            // Get charas
            $charas = $Docs->docs($namespace, 'charas', [])->asArray();
            // Get max event_id in database
            $lastEventId = $Docs->lastEventId();
            // end TX
            $Docs->transactionEnd();
            // done
            return $response->withJson([
                'title' => $meta['body']['title'],
                'desc' => $meta['body']['desc'],
                'msgs' => $msgs,
                'charas' => $charas,
                'lastEventId' => $lastEventId
            ], 200);
        });
        $this->get('/updates', function($request, $response, $args) {
            $Docs = $this->get('docs');
            // Lookup namespace
            $urlDoc = $Docs->doc('system', 'urls', $args['rpCode']);
            $namespace = $urlDoc['body']['rp_namespace'];
            // Get updates
            $lastEventId = $request->getQueryParam('lastEventId');
            $updates = $Docs->docs($namespace, null, ['since' => $lastEventId])->asArray();
            foreach ($updates as $doc) {
                $lastEventId = max($lastEventId, $doc['event_id']);
            }
            return $response->withJson([
                'id' => $lastEventId,
                'updates' => $updates->map(function($doc) {
                    return [
                        'type' => $doc['collection'],
                        'data' => $doc
                    ];
                })
            ]);
        });
        $this->get('/stream', function($request, $response, $args) {
            $Docs = $this->get('docs');
            // Lookup namespace
            $urlDoc = $Docs->doc('system', 'urls', $args['rpCode']);
            $namespace = $urlDoc['body']['rp_namespace'];
            // Start streaming
            $Stream = $this->get('stream');
            $Stream->start();
            // poll db for updates
            // TODO consider using pubsub
            $lastEventId = $Stream->lastEventId();
            while(true) {
                // Get new/updated docs in this rp's namespace
                $updates = $Docs->docs($namespace, null, ['since' => $lastEventId])->asArray();
                if (count($updates) > 0) {
                    // Spit each out as an event to the stream, and update the last event id
                    foreach ($updates as $doc) {
                        $evtBody = json_encode(['type' => $doc['collection'], 'data' => $doc]);
                        $lastEventId = max($lastEventId, $doc['event_id']);
                        $Stream->send(['data' => $evtBody, 'id' => $lastEventId]);
                    }
                }
                else {
                    // If no updates, just keep the stream alive
                    $Stream->ping();
                }
                // sleep for a second before checking the db again
                sleep(1);
            }
        });
        $this->get('/page/{pageNum:[1-9][0-9]*}', function ($request, $response, $args) {
            $Docs = $this->get('docs');
            // Lookup namespace
            $urlDoc = $Docs->doc('system', 'urls', $args['rpCode']);
            $namespace = $urlDoc['body']['rp_namespace'];
            // Get meta
            $meta = $Docs->doc($namespace, 'meta', 'meta');
            // Get msgs skip x*20 limit 20
            $skip = ($args['pageNum'] - 1) * 20;
            $msgs = $Docs->docs($namespace, 'msgs', ['reverse' => 'true', 'limit' => 60])->asArray();
            // Get charas
            $charas = $Docs->docs($namespace, 'charas', [])->asArray();
            // Get page count
            $msgCount = $Docs->docs($namespace, 'msgs', [])->count();
            $pageCount = ceil($msgCount / 20);
            // obfuscate ip's
            // return all
            return $response->withJson([
                'title' => $meta['body']['title'],
                'desc' => $meta['body']['desc'],
                'msgs' => $msgs,
                'charas' => $charas,
                'pageCount' => $pageCount
            ]);
        });
        // TODO potentially send download over POST request
        $this->get('/download.txt', function ($request, $response, $args) {
            $Docs = $this->get('docs');
            // Lookup namespace
            $urlDoc = $Docs->doc('system', 'urls');
            $namespace = $urlDoc['body']['rp_namespace'];
            // Get meta
            $meta = $Docs->doc($namespace, 'meta', 'meta');
            // Get msgs
            $msgCursor = $Docs->docs($namespace, 'msgs', [])->cursor();
            // Get charas
            $charas = $Docs->docs($namespace, 'charas', [])->asMap();
            // TODO make this actually work correctly
            // print title & desc
            $response->write($meta['title']);
            $response->write('---');
            // print all msgs
            while($msg = $msgCursor()) {
                $response->write($msg['content']);
            }
            // send as download
            return $response
                ->withAddedHeader('Content-Type', 'text/plain')
                ->withAddedHeader('Content-Disposition', 'attachment; filename="rp.txt"');
        });
        $this->post('/{collection:[a-z]+}', function ($request, $response, $args) {
            $Docs = $this->get('docs');
            // Lookup namespace
            $urlDoc = $Docs->doc('system', 'urls', $args['rpCode']);
            $namespace = $urlDoc['body']['rp_namespace'];
            // generate ID
            $doc_id = \EndyJasmi\Cuid::cuid();
            // validate {document collection and body}
            $collection = $args['collection'];
            try {
                $fields = $this->get('validator')->validate($collection, $request->getParsedBody());
            } catch (Exception $e) {
                return $response->withJson(['error'=>$e->getMessage()], 400);
            }
            // TODO get actual IP
            // TODO authentication/authorization, if that is added
            // get ip
            $ip = '1.1.1.1';
            // put the doc
            $Docs->create($namespace, $collection, $doc_id, $fields, $ip);
            // done
            return $response->withJson(['_id'=>$doc_id], 201);
        });
        $this->put('/{collection:[a-z]+}/{doc_id:[a-z0-9]+}', function ($request, $response, $args) {
            $Docs = $this->get('docs');
            // Lookup namespace
            $urlDoc = $Docs->doc('system', 'urls', $args['rpCode']);
            $namespace = $urlDoc['body']['rp_namespace'];
            // generate ID
            $doc_id = $args['doc_id'];
            // validate {document collection and body}
            $collection = $args['collection'];
            try {
                $fields = $this->get('validator')->validate($collection, $request->getParsedBody());
            } catch (Exception $e) {
                return $response->withJson(['error'=>$e->getMessage()], 400);
            }
            // TODO get actual IP
            // TODO authentication/authorization, if that is added
            // get ip
            $ip = '1.1.1.1';
            // put the doc
            $Docs->update($namespace, $collection, $doc_id, $fields, $ip);
            // done
            return $response->withStatus(204);
        });
    });
});
