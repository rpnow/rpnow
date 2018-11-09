<?php

$container = $app->getContainer();

$container['docs'] = function($c) {
    $illuminate = new \Illuminate\Database\Capsule\Manager;
    $illuminate->addConnection($c['settings']['db']);

    $illuminate->setAsGlobal();
    $illuminate->bootEloquent();

    class Doc extends \Illuminate\Database\Eloquent\Model {
        protected $fillable = ['namespace', 'doc_id', 'body', 'ip', 'auth_hash'];
        protected $casts = ['body' => 'array'];
        public $timestamps = false;
        public function scopeNs($query, $ns) {
            return $query->where('namespace', $ns);
        }
        public function scopeDocId($query, $id) {
            return $query->where('doc_id', $id);
        }
        public function scopeCurrent($query) {
            return $query->where('revision_age', 0);
        }
    }

    class DocsOperator {
        private $illuminate;
        private $settings;

        function __construct($illuminate, $settings) {
            $this->illuminate = $illuminate;
            $this->settings = $settings;
        }

        public function initializeDb() {
            // Check that file doesn't already exist, then create a blank file
            $dbFilename = $this->settings['db']['database'];

            if (file_exists($dbFilename)) {
                throw new Exception('Database already exists');
            }

            fopen($this->settings['db']['database'], 'w');

            // Schema
            $this->illuminate->schema()->create('docs', function($table) {
                $table->increments('event_id');
                $table->string('namespace');
                $table->string('doc_id');
                $table->integer('revision_age')->default(0);
                $table->string('body')->nullable();
                $table->timestamp('timestamp')->useCurrent();
                $table->string('ip')->nullable();
                $table->string('auth_hash')->nullable();

                $table->unique(['namespace', 'revision_age', 'doc_id']);
                $table->index(['namespace', 'doc_id']);
                $table->index('timestamp');
                $table->index('auth_hash');
            });
        }

        public function create($ns, $id, $body, $ip) {
            Doc::create(['namespace' => $ns, 'doc_id' => $id, 'ip' => $ip, 'body' => $body]);
        }

        public function put($ns, $id, $body, $ip) {
            $this->transactionStart();
            Doc::ns($ns)->docId($id)->increment('revision_age');
            $this->create($ns, $id, $body, $ip);
            $this->transactionEnd();
        }

        public function doc($ns, $id, $selectFields) {
            return Doc::ns($ns)->docId($id)->current()->firstOrFail();
        }

        public function docs($ns, $filters, $selectFields) {
            return new DocsQuery($ns, $filters, $selectFields);
        }

        public function lastEventId() {
            return Doc::max('event_id');
        }

        public function transactionStart() {
            $this->illuminate->connection()->beginTransaction();
        }

        public function transactionEnd() {
            $this->illuminate->connection()->commit();
        }
    };
    class DocsQuery {
        private $stmt;

        function __construct($ns, $filters, $selectFields) {

        }

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
    return new DocsOperator($illuminate, $c['settings']);
};