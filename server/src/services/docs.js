const Knex = require('knex');

const knex = Knex({
    client: 'sqlite3',
    connection: {
        filename: 'data.sqlite3',
    },
    useNullAsDefault: true,
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
            t.timestamp('timestamp').notNullable();
            t.string('ip', 47).nullable();
            t.string('auth_hash').nullable();

            t.unique(['namespace', 'collection', '_id', 'revision']);
            t.index('timestamp');
            t.index('ip');
            t.index('auth_hash');
        });
    }
}());

const formatQueryResult = (x) => {
    const { event_id, namespace, collection, body, auth_hash, ...meta } = x;
    const deleted = (body == null);
    return { ...JSON.parse(body), ...meta, deleted };
};

const Docs = {
    async create(namespace, collection, _id, body, ip) {
        await connected;
        const timestamp = new Date().toISOString();
        const revision = 0;
        const doc = { namespace, collection, _id, ip, revision, timestamp, body: JSON.stringify(body) };
        const [eventId] = await knex('docs').insert(doc);
        return { eventId, doc: formatQueryResult(doc) };
    },

    async update(namespace, collection, _id, body, ip) {
        await connected;
        if(!(await this.exists(namespace, collection, _id))) {
            throw new Error(`Document ${collection}:${_id} does not exist`);
        }
        // TODO just get lastRevision inside of the query
        const [{ lastRevision }] = await knex('docs').where({ namespace, collection, _id }).max('revision AS lastRevision');
        const revision = lastRevision + 1;
        const timestamp = new Date().toISOString();
        const doc = { namespace, collection, _id, ip, revision, timestamp, body: JSON.stringify(body) };
        const [eventId] = await knex('docs').insert(doc);
        return { eventId, doc: formatQueryResult(doc) };
    },

    docs(namespace, collection, filters) {
        // shortcut for getting just _id
        if (typeof filters === 'string') {
            const _id = filters;
            return this.docs(namespace, collection, { _id });
        }

        let q = knex('docs').where('docs.namespace', namespace)

        if (collection != null) {
            q = q.where('docs.collection', collection);
        }
        if (filters._id != null) {
            q = q.where('docs._id', filters._id);
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
            async single() {
                await connected;
                const result = await q.first();
                return formatQueryResult(result);
            },
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
                const [{ count }] = await q.count('* as count');
                return count;
            },
        };
    },

    async doc(...args) {
        return this.docs(...args).single();
    },

    async exists(namespace, collection, _id) {
        return (await this.doc(namespace, collection, _id)) != null;
    },

    async lastEventId() {
        await connected;
        const [{ value }] = await knex('docs').max('event_id AS value');
        return value;
    },
};

module.exports = Docs;
