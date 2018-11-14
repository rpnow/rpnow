<?php

$container = $app->getContainer();

$container['stream'] = function($c) {
    class Streamer {
        public function start() {
            header('Cache-Control: no-cache');
            header("Content-Type: text/event-stream\n\n");

            ob_implicit_flush(true);

            ob_end_flush();
            flush();
        }

        public function lastEventId() {
            if (isset($_SERVER["HTTP_LAST_EVENT_ID"])) return floatval($_SERVER["HTTP_LAST_EVENT_ID"]);
            if (isset($_GET["lastEventId"])) return floatval($_GET["lastEventId"]);
            return 0;
        }

        public function send($ev) {
            if (isset($ev['comment'])) {
                echo ": " . $ev['comment'] . "\n";
            }
            if (isset($ev['id'])) {
                echo "id: " . $ev['id'] . "\n";
            }
            if (isset($ev['event'])) {
                echo "event: " . $ev['event'] . "\n";
            }
            if (isset($ev['data'])) {
                echo "data: " . $ev['data'] . "\n";
            }

            echo "\n";

            ob_end_flush();
            flush();
        }
    }
    return new Streamer();
};

$app->get('/stream', function ($request, $response, $args) {
    $this->get('stream')->start();

    $cmd = __DIR__ . "/sub.sh";

    $descriptorspec = array(
        0 => array("pipe", "r"),   // stdin is a pipe that the child will read from
        1 => array("pipe", "w"),   // stdout is a pipe that the child will write to
        2 => array("pipe", "w")    // stderr is a pipe that the child will write to
    );

    $process = proc_open($cmd, $descriptorspec, $pipes, realpath('./'), array());
    if (is_resource($process)) {
        while ($s = fgets($pipes[1])) {
            $this->get('stream')->send([
                'event' => 'something',
                'data' => $s
            ]);
        }
    }
});