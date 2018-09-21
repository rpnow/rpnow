// This implementation is too slow! Use something else later!




// const fs = require('fs');
// const path = require('path');
// const Docxtemplater = require('docxtemplater');
// const JSZip = require('jszip');

// const docxTemplateBuffer = fs.readFileSync(path.join(__dirname, 'download-template.docx'));

// module.exports = ({

//     downloadDocx(rp, { includeOOC }) {
//         // ignore ooc messages if so desired
//         const msgs = includeOOC ? rp.msgs : rp.msgs.filter(msg => msg.type !== 'ooc');

//         const data = {
//             title: rp.title,
//             desc: rp.desc,
//             hasDesc: !!rp.desc,
//             msgs: msgs.map(({
//                 type, content, url, charaId,
//             }) => ({
//                 content,
//                 url,
//                 isNarrator: (type === 'narrator'),
//                 isOOC: (type === 'ooc'),
//                 isImage: (type === 'image'),
//                 isChara: (type === 'chara'),
//                 name: (type === 'chara' ? rp.charas.find(c => c._id.equals(charaId)).name.toUpperCase() : undefined),
//             })),
//         };

//         const doc = new Docxtemplater().loadZip(new JSZip(docxTemplateBuffer));
//         doc.setData(data);
//         doc.render();
//         const file = doc.getZip().generate({
//             type: 'nodebuffer',
//             mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//         });
//         return file;
//     },

// });

