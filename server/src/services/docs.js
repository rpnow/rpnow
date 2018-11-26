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
            t.string('_id', 64).notNullable();
            t.integer('revision').notNullable();
            t.json('body', 50000).nullable();
            t.timestamp('timestamp').defaultTo(knex.fn.now()).notNullable();
            t.string('ip', 47).nullable();
            t.string('auth_hash').nullable();

            t.unique(['namespace', 'collection', 'revision', '_id']);
            t.unique(['namespace', 'collection', '_id', 'revision']);
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
    async create(namespace, collection, _id, body, ip) {
        // TODO return entire created doc
        return knex('docs').insert({ namespace, collection, _id, ip, revision: 0, body: JSON.stringify(body) });
    },

    async update(namespace, collection, _id, body, ip) {
        if(!(await this.exists(namespace, collection, _id))) {
            throw new Error(`Document ${collection}:${_id} does not exist`);
        }
        return this.put(namespace, collection, _id, body, ip);
    },

    async put(namespace, collection, _id, body, ip) {
        await connected;
        // TODO just get lastRevision inside of the query
        const lastRevision = (await knex('docs').where({ namespace, collection, _id }).max('revision AS value').first()).value;
        await knex('docs').insert({ namespace, collection, _id, ip, revision: lastRevision+1, body: JSON.stringify(body) });
        // TODO return entire updated doc
    },

    async exists(namespace, collection, _id) {
        return (await this.doc(namespace, collection, _id)) != null;
    },

    async doc(namespace, collection, _id, filters = {}) {
        let q = knex('docs')
            .where('docs.namespace', namespace)
            .where('docs.collection', collection)
            .where('docs._id', _id)

        if (filters.snapshot != null) {
            q = q.where('docs.event_id', '<=', filters.snapshot);
        }
        if (!filters.includeHistory) {
            q = q.leftJoin('docs as newerDocs', function() {
                    this.on('docs.namespace', 'newerDocs.namespace');
                    this.andOn('docs.collection', 'newerDocs.collection');
                    this.andOn('docs._id', 'newerDocs._id');
                    this.andOn('docs.event_id', '<', 'newerDocs.event_id');
                    if (filters.snapshot != null) {
                        this.andOn('newerDocs.event_id', '<=', knex.raw('?', [filters.snapshot]));
                    }
                })
                .whereNull('newerDocs._id')
                .select('docs.*');
        }

        const result = await q.first();
        return formatQueryResult(result);
    },

    docs(namespace, collection, filters) {
        let q = knex('docs').where('docs.namespace', namespace)

        if (collection != null) {
            q = q.where('docs.collection', collection);
        }
        if (filters.since != null) {
            q = q.where('docs.event_id', '>', filters.since);
        }
        if (filters.snapshot != null) {
            q = q.where('docs.event_id', '<=', filters.snapshot);
        }
        if (filters.skip >= 0) {
            q = q.offset(filters.skip)
        }
        if (filters.limit >= 0) {
            q = q.limit(filters.limit);
        }
        if (!filters.includeHistory) {
            q = q.leftJoin('docs as newerDocs', function() {
                    this.on('docs.namespace', 'newerDocs.namespace');
                    this.andOn('docs.collection', 'newerDocs.collection');
                    this.andOn('docs._id', 'newerDocs._id');
                    this.andOn('docs.event_id', '<', 'newerDocs.event_id');
                    if (filters.snapshot != null) {
                        this.andOn('newerDocs.event_id', '<=', knex.raw('?', [filters.snapshot]));
                    }
                })
                .whereNull('newerDocs._id')
                .select('docs.*');
        }

        q = q
            .orderBy('docs.namespace', 'asc')
            .orderBy('docs.collection', 'asc')
            .orderBy('docs._id', filters.reverse ? 'desc' : 'asc')
            .orderBy('docs.revision', 'asc')
        
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
                    .reduce((map, x) => map.set(x._id, x), new Map());
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
};

module.exports = Docs;
