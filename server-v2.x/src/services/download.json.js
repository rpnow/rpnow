const { Transform } = require('stream');

module.exports = ({

    jsonFileStream({ title, desc, msgStream, charas }) {
        const rpStream = new Transform({
            transform(chunk, encoding, callback) {
                this.push(chunk);
                callback();
            },
        });

        const charaIdMap = charas.reduce((map,{_id},i) => map.set(_id.toString(),i), new Map());

        charas = charas.map(({ timestamp, name, color }) => ({ timestamp: timestamp ? new Date(timestamp*1000).toISOString(): null, name, color }))

        let writtenMeta = false;

        msgStream.on('data', (msg) => {
            const { timestamp, type, content, url, charaId } = msg;
            msg = ({ timestamp: new Date(timestamp*1000).toISOString(), type, content, url, charaId: charaIdMap.get(charaId && charaId.toString())});

            if (!writtenMeta) {
                // sometimes charas don't have timestamps so we just steal from the first message
                charas = charas.map(({timestamp, ...stuff}) => ({ timestamp: timestamp || msg.timestamp, ...stuff }))
                rpStream.write(`[\n${JSON.stringify({ title, desc, charas })}`);
                writtenMeta = true;
            }

            rpStream.write(`,\n${JSON.stringify(msg)}`)
        });

        msgStream.on('end', () => {
            if (!writtenMeta) {
                // sometimes charas don't have timestamps so we just steal from the first message
                charas = charas.map(({timestamp, ...stuff}) => ({ timestamp: timestamp || msg.timestamp, ...stuff }))
                rpStream.write(`[\n${JSON.stringify({ title, desc, charas })}`);
                writtenMeta = true;
            }

            rpStream.write('\n]\n');
            rpStream.end()
        });

        return rpStream;
    },

});
