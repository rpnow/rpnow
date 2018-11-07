<?php

$app->get('/stream', function ($request, $response, $args) {
    // return $response->write("Hello " . $args['name']);
    header('Cache-Control: no-cache');
    header("Content-Type: text/event-stream\n\n");

    while (1) {
        echo "event: ping\n";
        echo "data: ", json_encode(['foo' => 'bar']), "\n\n";

        ob_end_flush();
        flush();

        sleep(1);
        
        echo 'data: This is a message at time ' . date(DATE_ISO8601) . "\n\n";
        
        ob_end_flush();
        flush();

        sleep(1);
    }
});