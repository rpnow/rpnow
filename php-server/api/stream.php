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

        public function ping() {
            // TODO maybe just send a newline if that works
            $this->send(['event'=>'ping']);
        }
    }
    return new Streamer();
};
