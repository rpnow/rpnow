<?php

$container = $app->getContainer();

$container['docs'] = function($c) {
    $illuminate = new \Illuminate\Database\Capsule\Manager;
    $illuminate->addConnection($c['settings']['db']);

    $illuminate->setAsGlobal();
    $illuminate->bootEloquent();

    class Doc extends \Illuminate\Database\Eloquent\Model {
        protected $visible = ['_id', 'revision', 'body', 'timestamp', 'auth_hash', 'deleted'];
        protected $fillable = ['namespace', 'collection', 'doc_id', 'body', 'ip', 'auth_hash', 'revision'];
        protected $casts = ['event_id' => 'integer', 'body' => 'array', 'revision' => 'integer', 'revision_age' => 'integer'];
        protected $appends = ['_id', 'deleted'];
        public $timestamps = false;
        public function scopeNs($query, $ns) {
            return $query->where('namespace', $ns);
        }
        public function scopeColl($query, $coll) {
            return $query->where('collection', $coll);
        }
        public function scopeDocId($query, $id) {
            return $query->where('doc_id', $id);
        }
        public function scopeCurrent($query) {
            return $query->where('revision_age', 0);
        }
        public function getDeletedAttribute() {
            return is_null($this->attributes['body']);
        }
        public function getIdAttribute() {
            return $this->attributes['doc_id'];
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
                $table->string('collection');
                $table->string('doc_id');
                $table->integer('revision');
                $table->integer('revision_age')->default(0);
                $table->string('body')->nullable();
                $table->timestamp('timestamp')->useCurrent();
                $table->string('ip')->nullable();
                $table->string('auth_hash')->nullable();

                $table->unique(['namespace', 'collection', 'revision_age', 'doc_id']);
                $table->index(['namespace', 'collection', 'doc_id']);
                $table->index('timestamp');
                $table->index('auth_hash');
            });
        }

        public function create($ns, $coll, $id, $body, $ip) {
            Doc::create(['namespace' => $ns, 'collection' => $coll, 'doc_id' => $id, 'ip' => $ip, 'body' => $body, 'revision' => 0]);
        }

        public function update($ns, $coll, $id, $body, $ip) {
            Doc::ns($ns)->coll($coll)->docId($id)->firstOrFail();
            $this->put($ns, $coll, $id, $body, $ip);
        }

        public function put($ns, $coll, $id, $body, $ip) {
            $this->transactionStart();
            Doc::ns($ns)->coll($coll)->docId($id)->increment('revision_age');
            $revision = +Doc::ns($ns)->coll($coll)->docId($id)->max('revision_age');
            Doc::create(['namespace' => $ns, 'collection' => $coll, 'doc_id' => $id, 'ip' => $ip, 'body' => $body, 'revision' => $revision]);
            $this->transactionEnd();
        }

        public function doc($ns, $coll, $id, $selectFields) {
            return Doc::ns($ns)->coll($coll)->docId($id)->current()->firstOrFail();
        }

        public function docs($ns, $coll, $filters, $selectFields) {
            $q = Doc::ns($ns)->current();
            if (!is_null($coll)) {
                $q = $q->coll($coll);
            }
            if ($filters['skip']) {

            }
            if ($filters['limit']) {

            }
            if ($filters['reverse']) {

            }
            return new DocsQuery($q);
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
        private $query;

        function __construct($q) {
            $this->query = $q;
        }

        public function asArray() {
            return $this->query
                ->orderBy('namespace', 'ASC')
                ->orderBy('doc_id', 'ASC')
                ->orderBy('revision_age', 'DESC')
                ->get()
                ->map(function($doc) {
                    return collect($doc['body'])
                        ->merge($doc)
                        ->forget('body')
                        ->toArray();
                })
                ->toArray();
        }
        
        public function asMap() {
            return $this->query
                ->get()
                ->keyBy('doc_id')
                ->map(function($doc) {
                    return collect($doc['body'])
                        ->merge($doc)
                        ->forget('body')
                        ->toArray();
                })
                ->toArray();
        }

        public function count() {
            return $this->query->count();
        }

        public function cursor() {
            return function() {

            };
        }
    };
    return new DocsOperator($illuminate, $c['settings']);
};