const wrap = require('word-wrap');

module.exports = ({

    downloadTxt(rp, { includeOOC }) {
        // ignore ooc messages if so desired
        const msgs = includeOOC ? rp.msgs : rp.msgs.filter(msg => msg.type !== 'ooc');

        // header format
        const header = `${rp.title}\n${rp.desc || ''}\n----------`;

        // word-wrap and format all messages
        const body = msgs.map((msg) => {
            if (msg.type === 'narrator') {
                return wrap(msg.content, { width: 72, indent: '', cut: true });
            } else if (msg.type === 'ooc') {
                return wrap(`(( OOC: ${msg.content} ))`, { width: 72, indent: '', cut: true });
            } else if (msg.type === 'chara') {
                const chara = rp.charas.find(c => c._id.equals(msg.charaId));
                const indentedContent = wrap(msg.content, { width: 70, indent: '  ', cut: true });
                return `${chara.name.toUpperCase()}:\n${indentedContent}`;
            } else if (msg.type === 'image') {
                return `--- IMAGE ---\n${msg.url}\n-------------`;
            }

            throw new Error(`Unexpected message type: ${msg.type}`);
        });

        // contents of the text file
        const fileContents = [header, ...body]
            .join('\n\n') // double newlines separate each piece
            .replace(/\n/g, '\r\n'); // format it for windows

        // done
        return fileContents;
    },

});
