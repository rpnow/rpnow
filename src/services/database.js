const Knex = require('knex');
const path = require('path');
const debug = require('debug')('rpnow');

let knex;
let initCb;

const connected = new Promise(resolve => {
    initCb = (() => resolve());
})

async function open(dataDir) {
    knex = Knex({
        client: 'sqlite3',
        connection: (dataDir === ':memory:') ?
            ':memory:' :
            { filename: path.join(dataDir, 'rpnow.sqlite3') },
        useNullAsDefault: true,
    });
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
            t.string('userid').nullable();

            t.unique(['namespace', 'collection', '_id', 'revision']);
            t.index('timestamp');
            t.index('ip');
            t.index('userid');
        });
    }
    debug(`dbopen ${dataDir}`)
    initCb();
}

function formatQueryResult (x, options = {}) {
    const { event_id, namespace, collection, ip, body, ...docInfo } = x;
    const deleted = (body == null);
    const doc = { ...JSON.parse(body), ...docInfo, deleted };
    if (options.includeMeta) {
        const _meta = { event_id, namespace, collection, ip };
        return { ...doc, _meta };
    }
    else return doc;
}

const DB = module.exports = {
    open,

    async addDoc(namespace, collection, _id, body, { userid = null, ip = null, revision = 0, timestamp = (new Date().toISOString()) } = {}) {
        await connected;
        debug(`add ${namespace}/${collection}/${_id}:${revision}`)

        const doc = { namespace, collection, _id, userid, ip, revision, timestamp, body: JSON.stringify(body) };
        const [eventId] = await knex('docs').insert(doc);
        return { eventId, doc: formatQueryResult(doc) };
    },

    async updateDoc(namespace, collection, _id, body, { userid = null, ip = null, timestamp = (new Date().toISOString()) } = {}) {
        await connected;
        debug(`update ${namespace}/${collection}/${_id}`)

        if(!(await this.hasDoc(namespace, collection, _id))) {
            throw new Error(`Document ${collection}:${_id} does not exist`);
        }
        // TODO just get lastRevision inside of the query
        const [{ lastRevision }] = await knex('docs').where({ namespace, collection, _id }).max('revision AS lastRevision');
        const revision = lastRevision + 1;
        const doc = { namespace, collection, _id, userid, ip, revision, timestamp, body: JSON.stringify(body) };
        const [eventId] = await knex('docs').insert(doc);
        return { eventId, doc: formatQueryResult(doc) };
    },

    async putDoc(namespace, collection, _id, body, { userid = null, ip = null, timestamp = (new Date().toISOString()) } = {}) {
        const args = { userid, ip, timestamp }
        if (await DB.hasDoc(namespace, collection, _id)) {
            await DB.updateDoc(namespace, collection, _id, body, args)
        } else {
            await DB.addDoc(namespace, collection, _id, body, args);
        }
    },

    async addDocs(namespace, collection, docs) {
        await connected;
        debug(`add ${namespace}/${collection}/<${docs.length} docs>`)

        docs = docs.map(({ _id, userid = null, ip = null, revision = 0, timestamp = (new Date().toISOString()), body }) => {
            return { namespace, collection, _id, userid, ip, revision, timestamp, body: JSON.stringify(body) };
        });
        const eventIds = await knex.batchInsert('docs', docs, 100);
        return { eventId: Math.max(...eventIds) };
    },

    getDocs(namespace, collection, { _id, since, snapshot, skip, limit, includeHistory, reverse, includeMeta } = {}) {
        const query = () => {
            const namespaceLike = namespace.replace(/\*/g, '%');

            let q = knex('docs').where('docs.namespace', 'like', namespaceLike);

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
            
            return q;
        };
        
        return {
            async single() {
                await connected;
                debug(`getSingle ${namespace}/${collection}/${_id}`)

                const result = await query().first();
                if (!result) throw new Error(`Unable to find document. (collection:${collection}, _id:${_id})`)
                return formatQueryResult(result, { includeMeta });
            },
            async asArray() {
                await connected;
                debug(`getArray ${namespace}/${collection||'*'}/${_id||'*'}`)

                const res = await query();
                return res.map(row => formatQueryResult(row, { includeMeta }));
            },
            async asMap() {
                await connected;
                debug(`getMap ${namespace}/${collection||'*'}/${_id||'*'}`)

                const res = await query();
                return res.map(row => formatQueryResult(row, { includeMeta }))
                    .reduce((map, x) => map.set(x._id, x), new Map());
            },
            async count() {
                await connected;
                debug(`count ${namespace}/${collection||'*'}/${_id||'*'}`)

                const [{ count }] = await query().count('* as count');
                return count;
            },
            async purge() {
                await connected;
                debug(`***PURGE*** ${namespace}/${collection||'*'}/${_id||'*'}`)

                return query().del();
            },
        };
    },

    async getDoc(namespace, collection, _id, { ...filters } = {}) {
        return this.getDocs(namespace, collection, { _id, ...filters }).single();
    },

    async hasDoc(namespace, collection, _id) {
        return this.getDoc(namespace, collection, _id).then(() => true, () => false);
    },

    async lastEventId() {
        await connected;
        const [{ value }] = await knex('docs').max('event_id AS value');
        return value;
    },
};
