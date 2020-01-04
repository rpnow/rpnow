/**
 * The format of RP files is tentatively going to be a large JSON array
 * The first element of the array is going to be { version, title, charas }
 * The remaining documents will be messages
 */

const { Writable, Transform } = require('stream');
const JSONStream = require('JSONStream');
const cuid = require('cuid');
const DB = require('../services/database');
const { validate } = require('../services/validate-user-documents');

class BatchStream extends Transform {
  constructor(options) {
    super(options);

    if (!options.bufferSize) throw new Error('BatchStream: Specify buffer size');
    this.bufferSize = options.bufferSize;
    this.buffer = [];
  }
  _transform(item, encoding, callback) {
    this.buffer.push(item);
    if (this.buffer.length >= this.bufferSize) {
      this.push(this.buffer);
      this.buffer = [];
    }
    callback();
  }
  _flush(callback) {
    this.push(this.buffer);
    this.buffer = [];
    callback();
  }
}

module.exports = ({
  async exportRp(write) {
    const { title } = { title: "TITLE" }
    // TODO getting all msgs at once is potentially problematic for huge RP's; consider using streams if possible
    let msgs = await DB.getDocs('msgs').asArray(); 
    let charas = await DB.getDocs('charas').asArray();
    // TODO export webhooks?

    const charaIdMap = charas.reduce((map,{_id},i) => map.set(_id,i), new Map());

    charas = charas.map(({ timestamp, name, color }) => ({ timestamp, name, color }))
    msgs = msgs.map(({ timestamp, type, content, url, charaId }) => ({ timestamp, type, content, url, charaId: charaIdMap.get(charaId)}))

    write(`[\n${JSON.stringify({ title, charas })}`);
    msgs.forEach(msg => write(`,\n${JSON.stringify(msg)}`));
    write('\n]\n');
  },

  async importRp(userid, ip, rawStream, callback) {
    let handledMeta = false;
    const charaIdMap = new Map();
    // TODO import webhooks

    rawStream
      // Parse incoming text stream into elements of a JSON array
      .pipe(JSONStream.parse([true]))

      // Handle the initial element, the metadata. Then pass everything else through
      .pipe(new Transform({
        objectMode: true,
        async write(chunk, encoding, callback) {
          if (handledMeta) {
            this.push(chunk);
            callback();
            return;
          }

          let { charas, title } = chunk;
          // TODO add title
          // await validate('meta', meta); // TODO or throw BAD_RP
          // await DB.addDoc('meta', 'meta', meta, { userid, ip });

          // elevate body above timestamp
          charas = charas.map(({ timestamp, ...body }) => ({ timestamp, body }))

          // validate bodies
          await Promise.all(charas.map(({ body }) => validate('charas', body)));

          // add other meta
          charas = charas.map((doc) => ({ _id: cuid(), userid, ip, ...doc }))
          
          // populate charaIdMap
          charas.forEach(({ _id }, i) => charaIdMap.set(i, _id))

          await DB.addDocs('charas', charas);

          handledMeta = true;
          callback();
        }
      }))

      // The remaining elements are messages. Batch them to be processed in groups
      .pipe(new BatchStream({
        objectMode: true,
        bufferSize: 1000,
      }))
      
      // Add each message to the database
      .pipe(new Transform({
        objectMode: true,
        async write(msgs, encoding, callback) {
          // hydrate charaId
          msgs = msgs.map(({ charaId, ...body }) => {
            if (charaId == null) return body;
            return { ...body, charaId: charaIdMap.get(charaId) };
          })
          // chop content to 10000 length
          msgs = msgs.map(({ content, ...body }) => {
            if (content == null) return body;
            if (content.length <= 10000) return { ...body, content };
            return { ...body, content: content.substr(0, 10000) };
          })
          // elevate body above timestamp
          msgs = msgs.map(({ timestamp, ...body }) => ({ timestamp, body }))

          // validate bodies
          await Promise.all(msgs.map(({ body }) => validate('msgs', body)));

          // add other meta
          msgs = msgs.map((doc) => ({ _id: cuid(), userid, ip, ...doc }))

          await DB.addDocs('msgs', msgs);
          this.push(msgs.length);
          callback();
        }
      }))

      .pipe(new Writable({ 
        objectMode: true,
        write(info, encoding, callback) {
          this.count = (this.count || 0) + info;
          callback();
        }
      }))

      // Done!
      .on('finish', () => callback());
  },
});
