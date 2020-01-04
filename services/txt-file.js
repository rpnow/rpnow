const wrap = require('word-wrap');

function msgText(msg, charasMap) {
  if (msg.type === 'narrator') {
    return wrap(msg.content, { width: 72, indent: '', cut: true });
  } else if (msg.type === 'ooc') {
    return wrap(`(( OOC: ${msg.content} ))`, { width: 72, indent: '', cut: true });
  } else if (msg.type === 'chara') {
    const chara = charasMap.get(msg.charaId);
    const indentedContent = wrap(msg.content, { width: 70, indent: '  ', cut: true });
    return `${chara.name.toUpperCase()}:\n${indentedContent}`;
  } else if (msg.type === 'image') {
    return `--- IMAGE ---\n${msg.url}\n-------------`;
  }

  throw new Error(`Unexpected message type: ${msg.type}`);
}

module.exports = ({
  generateTextFile({ title, msgs, charasMap, includeOOC }, writeRaw) {
    // Make sure to only write windows-compatible newlines
    const write = str => writeRaw(str.replace(/\n/g, '\r\n'));

    // header format
    write(`${title}\n\n----------\n\n`);

    // Write each message
    msgs.forEach(msg => {
      if (msg.type !== 'ooc' || includeOOC) {
        const msgBlock = msgText(msg, charasMap);
        write(msgBlock+'\n\n');
      }
    })
  },
});
