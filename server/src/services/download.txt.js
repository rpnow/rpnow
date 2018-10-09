const { Transform } = require('stream');
const wrap = require('word-wrap');

function msgText(msg, charas) {
    if (msg.type === 'narrator') {
        return wrap(msg.content, { width: 72, indent: '', cut: true });
    } else if (msg.type === 'ooc') {
        return wrap(`(( OOC: ${msg.content} ))`, { width: 72, indent: '', cut: true });
    } else if (msg.type === 'chara') {
        const chara = charas.find(c => c._id.equals(msg.charaId));
        const indentedContent = wrap(msg.content, { width: 70, indent: '  ', cut: true });
        return `${chara.name.toUpperCase()}:\n${indentedContent}`;
    } else if (msg.type === 'image') {
        return `--- IMAGE ---\n${msg.url}\n-------------`;
    }

    throw new Error(`Unexpected message type: ${msg.type}`);
}

module.exports = ({

    txtFileStream({ title, desc = null, msgStream, charas }, { includeOOC }) {
        const rpStream = new Transform({
            transform(chunk, encoding, callback) {
                console.log(typeof chunk);
                this.push(`${chunk.toString().replace(/\n/g, '\r\n')}\r\n\r\n`);
                callback();
            },
        });

        // header format
        rpStream.write(`${title}\n${desc || ''}\n----------`);

        msgStream.on('data', (msg) => {
            if (msg.type !== 'ooc' || includeOOC) {
                rpStream.write(msgText(msg, charas));
            }
        });

        msgStream.on('end', () => rpStream.end());

        return rpStream;
    },

});
