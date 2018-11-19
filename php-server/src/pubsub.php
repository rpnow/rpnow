<?php

// TODO use this?

$container = $app->getContainer();

$container['pubsub'] = function($c) {
    class PubSub {
        public function sub($topic, $callback) {
            $cmd = __DIR__ . "/sub.sh " . $topic;

            $descriptorspec = [
                0 => ['pipe', 'r'], // stdin is a pipe that the child will read from
                1 => ['pipe', 'w'], // stdout is a pipe that the child will write to
                2 => ['pipe', 'w'] // stderr is a pipe that the child will write to
            ];

            $process = proc_open($cmd, $descriptorspec, $pipes, __DIR__, []);

            if (!is_resource($process)) {
                throw new Exception('Failed to open ./sub.sh (is not resource)');
            }

            while($data = fgets($pipes[1])) {
                $callback($data);
            }
        }
        public function pub($topic, $data) {
            $cmd = __DIR__ . "/pub.sh " . $topic;

            $descriptorspec = [
                0 => ['pipe', 'r'], // stdin is a pipe that the child will read from
                // 1 => null, // stdout is a pipe that the child will write to
                // 2 => null // stderr is a pipe that the child will write to
            ];

            $process = proc_open($cmd, $descriptorspec, $pipes, __DIR__, []);

            fwrite($pipes[0], $data . "\n");
            fclose($pipes[0]);
            proc_close($process);
        }
    }
    return new PubSub();
};

// TODO remove test route
$app->get('/sub', function ($request, $response, $args) {
    $this->get('stream')->start();

    $this->get('stream')->send(['data'=>'hello']);

    $this->get('pubsub')->sub('abc', function($data) {
        $this->get('stream')->send([
            'event' => 'something',
            'data' => $data
        ]);
    });
});

// TODO remove test route
$app->get('/pub/{stuff}', function ($request, $response, $args) {
    $this->get('pubsub')->pub('abc', $args['stuff']);
    $response->withStatus(204);
});

