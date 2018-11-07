<?php

$app->group('/admin', function() {
    $this->get('/setup', function ($request, $response, $args) {
        $this->get('db')->exec(
            "CREATE TABLE docs (
                event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                namespace TEXT NOT NULL,
                doc_id TEXT NOT NULL,
                revision_age INT DEFAULT 0 NOT NULL,
                body TEXT,
                timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
                ip TEXT,
                hash TEXT,

                CONSTRAINT doc_id_namespace_table UNIQUE (namespace, revision_age, doc_id)
            )"
        );
        $this->get('db')->exec(
            "CREATE INDEX hash_index ON docs (hash) WHERE hash IS NOT NULL"
        );
        return $response->withJson(['ok'], 200);
    });
});