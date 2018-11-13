<?php

$container = $app->getContainer();

$container['docs'] = function($c) {
    $illuminate = new \Illuminate\Database\Capsule\Manager;
    $illuminate->addConnection($c['settings']['db']);

    $illuminate->setAsGlobal();
    $illuminate->bootEloquent();

    class Doc extends \Illuminate\Database\Eloquent\Model {
        protected $visible = ['doc_id', 'revision', 'revision_age', 'body', 'timestamp', 'auth_hash', 'deleted'];
        protected $fillable = ['namespace', 'doc_id', 'body', 'ip', 'auth_hash', 'revision'];
        protected $casts = ['event_id' => 'integer', 'body' => 'array', 'revision' => 'integer', 'revision_age' => 'integer'];
        protected $appends = ['deleted'];
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
        public function getDeletedAttribute() {
            return is_null($this->attributes['body']);
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
                $table->integer('revision');
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
            Doc::create(['namespace' => $ns, 'doc_id' => $id, 'ip' => $ip, 'body' => $body, 'revision' => 0]);
        }

        public function update($ns, $id, $body, $ip) {
            Doc::ns($ns)->docId($id)->firstOrFail();
            $this->put($ns, $id, $body, $ip);
        }

        public function put($ns, $id, $body, $ip) {
            $this->transactionStart();
            Doc::ns($ns)->docId($id)->increment('revision_age');
            $revision = +Doc::ns($ns)->docId($id)->max('revision_age');
            Doc::create(['namespace' => $ns, 'doc_id' => $id, 'ip' => $ip, 'body' => $body, 'revision' => $revision]);
            $this->transactionEnd();
        }

        public function doc($ns, $id, $selectFields) {
            return Doc::ns($ns)->docId($id)->current()->firstOrFail();
        }

        public function docs($ns, $filters, $selectFields) {
            $q = Doc::ns($ns)->current();
            if ($filters['prefix']) {
                $q = $q->where('doc_id', 'like', $filters['prefix'].'%');
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
                ->toArray();
        }
        
        public function asMap() {
            return $this->query
                ->get()
                ->keyBy('doc_id')
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