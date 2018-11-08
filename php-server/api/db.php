<?php

$container = $app->getContainer();

$container['pdo'] = function($c) {
    $pdo = new PDO('sqlite:/tmp/db.sqlite3');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    return $pdo;
};

$container['docs'] = function($c) {
    return new class($c['pdo']) {

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
            return new class($ns, $params, $selectFields) {
                public function array() {

                }
                
                public function map() {

                }

                public function count() {

                }

                public function cursor() {
                    return function() {

                    };
                }
            };
        }

        public function lastEventId() {

        }

        public function transactionStart() {

        }

        public function transactionEnd() {

        }
    };

};