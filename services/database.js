const Knex = require('knex');
const path = require('path');

const filename = path.join(__dirname, '..', '.data', 'rpnow.sqlite3');

const knex = Knex({
  client: 'sqlite3',
  connection: { filename },
  useNullAsDefault: true,
});

const connected = knex.schema.hasTable('docs').then(hasTable => {
  if (hasTable) return;

  return knex.schema.createTable('docs', (t) => {
    t.increments('event_id').primary();
    t.string('collection').notNullable();
    t.string('_id', 64).notNullable();
    t.integer('revision').notNullable();
    t.json('body', 50000).nullable();
    t.timestamp('timestamp').notNullable();
    t.string('ip', 47).nullable();
    t.string('userid').nullable();

    t.unique(['collection', '_id', 'revision']);
    t.index('timestamp');
    t.index('ip');
    t.index('userid');
  });
}).then(() => {
  console.debug(`dbopen ${filename}`)
  return true
})

function formatQueryResult (x, options = {}) {
  const { event_id, collection, ip, body, ...docInfo } = x;
  const deleted = (body == null);
  const doc = { ...JSON.parse(body), ...docInfo, deleted };
  if (options.includeMeta) {
    const _meta = { event_id, collection, ip };
    return { ...doc, _meta };
  }
  else return doc;
}

module.exports = {
  async addDoc(collection, _id, body, { userid = null, ip = null, revision = 0, timestamp = (new Date().toISOString()) } = {}) {
    await connected;
    console.debug(`add ${collection}/${_id}:${revision}`)

    const doc = { collection, _id, userid, ip, revision, timestamp, body: JSON.stringify(body) };
    const [eventId] = await knex('docs').insert(doc);
    return { eventId, doc: formatQueryResult(doc) };
  },

  async updateDoc(collection, _id, body, { userid = null, ip = null, timestamp = (new Date().toISOString()) } = {}) {
    await connected;
    console.debug(`update ${collection}/${_id}`)

    if(!(await this.hasDoc(collection, _id))) {
      throw new Error(`Document ${collection}:${_id} does not exist`);
    }
    // TODO just get lastRevision inside of the query
    const [{ lastRevision }] = await knex('docs').where({ collection, _id }).max('revision AS lastRevision');
    const revision = lastRevision + 1;
    const doc = { collection, _id, userid, ip, revision, timestamp, body: JSON.stringify(body) };
    const [eventId] = await knex('docs').insert(doc);
    return { eventId, doc: formatQueryResult(doc) };
  },

  async addDocs(collection, docs) {
    await connected;
    console.debug(`add ${collection}/<${docs.length} docs>`)

    docs = docs.map(({ _id, userid = null, ip = null, revision = 0, timestamp = (new Date().toISOString()), body }) => {
      return { collection, _id, userid, ip, revision, timestamp, body: JSON.stringify(body) };
    });
    const eventIds = await knex.batchInsert('docs', docs, 100);
    return { eventId: Math.max(...eventIds) };
  },

  getDocs(collection, { _id, since, snapshot, skip, limit, includeHistory, reverse, includeMeta } = {}) {
    const query = () => {
      let q = knex('docs').where('docs.collection', collection);

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
        .orderBy('docs.collection', 'asc')
        .orderBy('docs._id', reverse ? 'desc' : 'asc')
        .orderBy('docs.revision', 'asc')
      
      return q;
    };
    
    return {
      async single() {
        await connected;
        console.debug(`getSingle ${collection}/${_id}`)

        const result = await query().first();
        if (!result) throw new Error(`Unable to find document. (collection:${collection}, _id:${_id})`)
        return formatQueryResult(result, { includeMeta });
      },
      async asArray() {
        await connected;
        console.debug(`getArray ${collection||'*'}/${_id||'*'}`)

        const res = await query();
        return res.map(row => formatQueryResult(row, { includeMeta }));
      },
      async asMap() {
        await connected;
        console.debug(`getMap ${collection||'*'}/${_id||'*'}`)

        const res = await query();
        return res.map(row => formatQueryResult(row, { includeMeta }))
          .reduce((map, x) => map.set(x._id, x), new Map());
      },
      async count() {
        await connected;
        console.debug(`count ${collection||'*'}/${_id||'*'}`)

        const [{ count }] = await query().count('* as count');
        return count;
      },
    };
  },

  async getDoc(collection, _id, { ...filters } = {}) {
    return this.getDocs(collection, { _id, ...filters }).single();
  },

  async hasDoc(collection, _id) {
    return this.getDoc(collection, _id).then(_ => true, _ => false);
  },

  async lastEventId() {
    await connected;
    const [{ value }] = await knex('docs').max('event_id AS value');
    return value;
  },
};
