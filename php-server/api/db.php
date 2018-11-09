<?php

$container = $app->getContainer();

$container['eloquent'] = function($c) {
    $capsule = new \Illuminate\Database\Capsule\Manager;
    $capsule->addConnection($c['settings']['db']);

    $capsule->setAsGlobal();
    $capsule->bootEloquent();

    return $capsule;
};

$container['pdo'] = function($c) {
    // $pdo = new PDO('sqlite:/tmp/db.sqlite3');
    // $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo = $c['eloquent']->connection()->getPdo();
    return $pdo;
};

$container['docs'] = function($c) {
    class DocsOperator {
        private $pdo;

        function __construct($pdo) {
            $this->pdo = $pdo;
        }

        public function create($ns, $id, $body, $ip) {

        }

        public function put($ns, $id, $body, $ip) {

        }

        public function doc($ns, $id, $selectFields) {

        }

        public function docs($ns, $params, $selectFields) {
            return new DocsQuery($ns, $params, $selectFields);
        }

        public function lastEventId() {

        }

        public function transactionStart() {

        }

        public function transactionEnd() {

        }
    };
    class DocsQuery {
        public function asArray() {

        }
        
        public function asMap() {

        }

        public function count() {

        }

        public function cursor() {
            return function() {

            };
        }
    };
    return new DocsOperator($c['pdo']);
};