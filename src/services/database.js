const Knex = require('knex');

const knex = Knex({
    client: 'sqlite3',
    connection: {
        filename: 'data/rpnow.sqlite3',
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

function formatQueryResult (x, options = {}) {
    const { event_id, namespace, collection, auth_hash, body, ...docInfo } = x;
    const deleted = (body == null);
    const doc = { ...JSON.parse(body), ...docInfo, deleted };
    if (options.includeMeta) {
        const _meta = { event_id, namespace, collection, auth_hash };
        return { ...doc, _meta };
    }
    else return doc;
}

module.exports = {
    async addDoc(namespace, collection, _id, body, ip) {
        await connected;
        const timestamp = new Date().toISOString();
        const revision = 0;
        const doc = { namespace, collection, _id, ip, revision, timestamp, body: JSON.stringify(body) };
        const [eventId] = await knex('docs').insert(doc);
        return { eventId, doc: formatQueryResult(doc) };
    },

    async updateDoc(namespace, collection, _id, body, ip) {
        await connected;
        if(!(await this.hasDoc(namespace, collection, _id))) {
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

    getDocs(namespace, collection, { _id, since, snapshot, skip, limit, includeHistory, reverse, includeMeta } = {}) {
        let q = knex('docs').where('docs.namespace', namespace)

        if (collection != null) {
            q = q.where('docs.collection', collection);
        }
        if (_id != null) {
            q = q.where('docs._id', _id);
        }
        if (since != null) {
            q = q.where('docs.event_id', '>', since);
        }
        if (snapshot != null) {
            q = q.where('docs.event_id', '<=', snapshot);
        }
        if (skip >= 0) {
            q = q.offset(skip)
        }
        if (limit >= 0) {
            q = q.limit(limit);
        }
        if (!includeHistory) {
            q = q.leftJoin('docs as newerDocs', function() {
                    this.on('docs.namespace', 'newerDocs.namespace');
                    this.andOn('docs.collection', 'newerDocs.collection');
                    this.andOn('docs._id', 'newerDocs._id');
                    this.andOn('docs.event_id', '<', 'newerDocs.event_id');
                    if (snapshot != null) {
                        this.andOn('newerDocs.event_id', '<=', knex.raw('?', [snapshot]));
                    }
                })
                .whereNull('newerDocs._id')
                .select('docs.*');
        }

        q = q
            .orderBy('docs.namespace', 'asc')
            .orderBy('docs.collection', 'asc')
            .orderBy('docs._id', reverse ? 'desc' : 'asc')
            .orderBy('docs.revision', 'asc')
        
        return {
            async single() {
                await connected;
                const result = await q.first();
                if (!result) throw new Error(`Unable to find document. (collection:${collection}, _id:${_id})`)
                return formatQueryResult(result, { includeMeta });
            },
            async asArray() {
                await connected;
                const res = await q;
                return res.map(row => formatQueryResult(row, { includeMeta }));
            },
            async asMap() {
                await connected;
                const res = await q;
                return res.map(row => formatQueryResult(row, { includeMeta }))
                    .reduce((map, x) => map.set(x._id, x), new Map());
            },
            async count() {
                await connected;
                const [{ count }] = await q.count('* as count');
                return count;
            },
        };
    },

    async getDoc(namespace, collection, _id, { ...filters } = {}) {
        return this.getDocs(namespace, collection, { _id, ...filters }).single();
    },

    async hasDoc(namespace, collection, _id) {
        return this.getDoc(namespace, collection, _id).then(_ => true, _ => false);
    },

    async lastEventId() {
        await connected;
        const [{ value }] = await knex('docs').max('event_id AS value');
        return value;
    },
};
