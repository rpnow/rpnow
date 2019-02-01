const DB = require('../services/database');

module.exports = ({
    async exportRp(rpNamespace, write) {
        const { title, desc } = await DB.getDoc(rpNamespace, 'meta', 'meta');
        // TODO getting all msgs at once is potentially problematic for huge RP's; consider using streams if possible
        let msgs = await DB.getDocs(rpNamespace, 'msgs').asArray(); 
        let charas = await DB.getDocs(rpNamespace, 'charas').asArray();

        const charaIdMap = charas.reduce((map,{_id},i) => map.set(_id,i), new Map());

        charas = charas.map(({ timestamp, name, color }) => ({ timestamp, name, color }))
        msgs = msgs.map(({ timestamp, type, content, url, charaId }) => ({ timestamp, type, content, url, charaId: charaIdMap.get(charaId)}))

        write(`[\n${JSON.stringify({ title, desc, charas })}`);
        msgs.forEach(msg => write(`,\n${JSON.stringify(msg)}`));
        write('\n]\n');
    },
});
