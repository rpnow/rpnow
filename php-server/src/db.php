<?php

$container = $app->getContainer();

$container['docs'] = function($c) {
    $illuminate = new \Illuminate\Database\Capsule\Manager;
    $illuminate->addConnection($c['settings']['db']);

    $illuminate->setAsGlobal();
    $illuminate->bootEloquent();

    // Immediately initialize document database if it doesn't already exist
    if (!file_exists($c['settings']['db']['database'])) {
        // Create empty file
        mkdir(dirname($c['settings']['db']['database']), 0770, true);
        fopen($c['settings']['db']['database'], 'w');

        // Schema
        $illuminate->schema()->create('docs', function($table) {
            $table->increments('event_id');
            $table->string('namespace');
            $table->string('collection');
            // TODO consider just calling this _id for client consistency
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

    class Doc extends \Illuminate\Database\Eloquent\Model {
        protected $hidden = ['event_id', 'namespace', 'collection', 'doc_id', 'revision_age', 'body', 'ip'];
        protected $fillable = ['namespace', 'collection', 'doc_id', 'body', 'ip', 'auth_hash', 'revision'];
        protected $casts = ['event_id' => 'integer', 'body' => 'array', 'revision' => 'integer', 'revision_age' => 'integer'];
        protected $appends = ['_id', 'deleted'];
        public $timestamps = false;
        // TODO do we realy need all these scope methods?
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
        public function dissolveBody() {
            foreach ($this['body'] as $prop => $val) {
                $this[$prop] = $val;
            }
            return $this;
        }
    }

    class DocsOperator {
        private $illuminate;
        private $settings;

        function __construct($illuminate, $settings) {
            $this->illuminate = $illuminate;
            $this->settings = $settings;
        }

        public function create($ns, $coll, $id, $body, $ip) {
            Doc::create(['namespace' => $ns, 'collection' => $coll, 'doc_id' => $id, 'ip' => $ip, 'body' => $body, 'revision' => 0]);
        }

        public function update($ns, $coll, $id, $body, $ip) {
            Doc::ns($ns)->coll($coll)->docId($id)->firstOrFail();
            $this->put($ns, $coll, $id, $body, $ip);
        }

        public function put($ns, $coll, $id, $body, $ip) {
            // TODO use illuminate's transaction closure?
            $this->transactionStart();
            Doc::ns($ns)->coll($coll)->docId($id)->increment('revision_age');
            $revision = +Doc::ns($ns)->coll($coll)->docId($id)->max('revision_age');
            Doc::create(['namespace' => $ns, 'collection' => $coll, 'doc_id' => $id, 'ip' => $ip, 'body' => $body, 'revision' => $revision]);
            $this->transactionEnd();
        }

        public function doc($ns, $coll, $id) {
            return Doc::ns($ns)->coll($coll)->docId($id)->current()->firstOrFail()->dissolveBody();
        }

        public function docs($ns, $coll, $filters) {
            $q = Doc::ns($ns)->current();
            if (!is_null($coll)) {
                $q = $q->coll($coll);
            }
            if ($filters['since']) {
                $q = $q->where('event_id', '>', $filters['since']);
            }
            if ($filters['skip']) {
                $q = $q->skip($filters['skip']);
            }
            if ($filters['limit']) {
                $q = $q->take($filters['limit']);
            }
            if ($filters['reverse']) {
                $q = $q->orderBy('event_id', 'DESC');
            } else {
                $q = $q->orderBy('event_id', 'ASC');
            }
            return new DocsQuery($q);
        }

        public function lastEventId() {
            return intval(Doc::max('event_id'));
        }

        public function transactionStart() {
            // TODO use illuminate's transaction closure?
            $this->illuminate->connection()->beginTransaction();
        }

        public function transactionEnd() {
            // TODO use illuminate's transaction closure?
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
                ->get()
                ->transform(function($doc) {
                    return $doc->dissolveBody();
                });
        }
        
        public function asMap() {
            return $this->query
                ->get()
                ->transform(function($doc) {
                    return $doc->dissolveBody();
                })
                ->keyBy('doc_id');
        }

        public function count() {
            return $this->query->count();
        }

        public function each($callback) {
            $this->query->chunk(200, function($docs) use ($callback) {
                foreach ($docs as $doc) {
                    $doc = $doc->dissolveBody();
                    $callback($doc);
                }
            });
        }
    };
    return new DocsOperator($illuminate, $c['settings']);
};