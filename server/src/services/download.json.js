const { Transform } = require('stream');

module.exports = ({

    jsonFileStream({ title, desc = null, msgStream, charas }) {
        const rpStream = new Transform({
            transform(chunk, encoding, callback) {
                this.push(chunk);
                callback();
            },
        });

        rpStream.write('{\n');
        rpStream.write('"version": 1,\n');
        rpStream.write(`"title": ${JSON.stringify(title)},\n`);
        rpStream.write(`"desc": ${JSON.stringify(desc || null)},\n`);
        rpStream.write(`"charas": [\n`);
        for (const chara of charas) {
            if (chara !== charas[0]) rpStream.write(',\n');
            rpStream.write(JSON.stringify(chara));
        }
        rpStream.write('],\n');
        rpStream.write(`"msgs": [\n`);
        let firstMsg = true;
        msgStream.on('data', (msg) => {
            if (!firstMsg) rpStream.write(',\n');
            firstMsg = false;
            rpStream.write(JSON.stringify(msg));
        });

        msgStream.on('end', () => {
            rpStream.write('\n]\n}\n');
            rpStream.end()
        });

        return rpStream;
    },

});
