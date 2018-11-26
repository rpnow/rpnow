const Knex = require('knex');

const knex = Knex({
    client: 'sqlite3',
    connection: {
        filename: 'data.sqlite3',
    },
});

const connected = (async function connect() {
    if (!(await knex.schema.hasTable('docs'))) {
        await knex.schema.createTable('docs', (t) => {
            t.increments('event_id').primary();
            t.string('namespace').notNullable();
            t.string('collection').notNullable();
            t.string('doc_id', 64).notNullable();
            t.integer('revision').notNullable();
            t.integer('revision_age').defaultTo(0).notNullable();
            t.json('body', 50000).nullable();
            t.timestamp('timestamp').defaultTo(knex.fn.now()).notNullable();
            t.string('ip', 47).nullable();
            t.string('auth_hash').nullable();

            t.unique(['namespace', 'collection', 'revision_age', 'doc_id']);
            t.unique(['namespace', 'collection', 'doc_id', 'revision']);
            t.index('timestamp');
            t.index('ip');
            t.index('auth_hash');
        });
    }
}());

const formatQueryResult = (x) => {
    const { body, ...meta } = x;
    return { ...JSON.parse(body), ...meta };
};

const Docs = {
    async create(namespace, collection, doc_id, body, ip) {
        // TODO return entire created doc
        return knex('docs').insert({ namespace, collection, doc_id, ip, revision: 0, revision_age: 0, body: JSON.stringify(body) });
    },

    async update(namespace, collection, doc_id, body, ip) {
        if(!(await this.exists(namespace, collection, doc_id))) {
            throw new Error(`Document ${collection}:${doc_id} does not exist`);
        }
        return this.put(namespace, collection, doc_id, body, ip);
    },

    async put(namespace, collection, doc_id, body, ip) {
        await connected;
        return knex.transaction(async (tx) => {
            await tx('docs').where({ namespace, collection, doc_id }).increment('revision_age');
            const revision = tx('docs').where({ namespace, collection, doc_id }).max('revision_age');
            await tx('docs').insert({ namespace, collection, doc_id, ip, revision, revision_age: 0, body: JSON.stringify(body) });
        });
        // TODO return entire updated doc
    },

    async exists(namespace, collection, doc_id) {
        return (await this.doc(namespace, collection, doc_id)) != null;
    },

    async doc(namespace, collection, doc_id) {
        const x = await knex('docs').where({ namespace, collection, doc_id, revision_age: 0 }).first();
        return formatQueryResult(x);
    },

    docs(namespace, collection, filters) {
        let q = knex('docs').where({ namespace, revision_age: 0 })

        if (collection != null) {
            q = q.where({ collection });
        }
        if (filters.since != null) {
            q = q.where('event_id', '>', filters.since);
        }
        if (filters.skip >= 0) {
            q = q.offset(filters.skip)
        }
        if (filters.limit >= 0) {
            q = q.limit(filters.limit);
        }

        q = q
            .orderBy('namespace', 'asc')
            .orderBy('collection', 'asc')
            .orderBy('doc_id', filters.reverse ? 'desc' : 'asc')
            .orderBy('revision', 'asc')
        
        return {
            async asArray() {
                await connected;
                const res = await q;
                return res.map(formatQueryResult);
            },
            async asMap() {
                await connected;
                const res = await q;
                return res.map(formatQueryResult)
                    .reduce((map, x) => map.set(x.doc_id, x), new Map());
            },
            async count() {
                await connected;
                return q.count();
            },
            async asStream() {
                // TODO
            }
        };
    },

    async lastEventId() {
        return (await knex('docs').max('event_id AS value').first()).value;
    },

    async transaction(callback) {
        // TODO
    },
};

module.exports = Docs;
