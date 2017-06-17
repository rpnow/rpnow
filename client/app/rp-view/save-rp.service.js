'use strict';

angular.module('rpnow')

.factory('saveRpService', ['$http', function($http) {
    function saveTxt(rp, includeOOC) {
        var out = rp.msgs;
        if (!includeOOC) out = out.filter(function(msg) {return msg.type!=='ooc'});
        out = out.map(function(msg) {
            if(msg.type === 'narrator') {
                return wordwrap(msg.content, 72);
            }
            else if(msg.type === 'ooc') {
                return wordwrap('(( OOC: '+msg.content+' ))', 72);
            }
            else if(msg.type === 'chara') {
                return rp.charas[msg.charaId].name.toUpperCase()+':\r\n'
                    + wordwrap(msg.content, 70, '  ');
            }
            else if(msg.type === 'image') {
                return '--- IMAGE ---\r\n' + msg.url + '\r\n-------------';
            }
            else {
                throw new Error('Unexpected message type: '+msg.type);
            }
        });
        out.unshift(rp.title+'\r\n'+(rp.desc||'')+'\r\n----------');
        var str = out.join('\r\n\r\n');
        var blob = new Blob([str], {type: "text/plain;charset=utf-8"});
        saveAs(blob, rp.title + ".txt");
    }
    function wordwrap(str, width, indent) {
        return str.split('\n')
            .map(function(paragraph) { return (paragraph
                .match(/\S+\s*/g) || [])
                .reduce(function(lines,word) {
                        if ((lines[lines.length-1]+word).trimRight().length>width)
                            word.match(new RegExp("\\S{1,"+width+"}\\s*",'g'))
                                    .forEach(function(wordPiece){ lines.push(wordPiece); })
                        else
                            lines[lines.length-1] += word;
                        return lines;
                }, [''])
                .map(function(str) { return (indent||'')+str.trimRight(); })
            })
            .reduce(function(lines, paragraph) {
                paragraph.forEach(function(line) { lines.push(line); });
                return lines;
            }, [])
            .join('\r\n');
    }

    var docxTemplateRequest;

    function saveDocx(rp, includeOOC) {
        var rpData = JSON.parse(JSON.stringify(rp));
        rpData.hasDesc = !!rpData.desc;
        if (!includeOOC) rpData.msgs = rpData.msgs.filter(function(msg) {return msg.type!=='ooc'});
        rpData.msgs.forEach(function(msg) {
            msg.isNarrator = (msg.type === 'narrator');
            msg.isOOC = (msg.type === 'ooc');
            msg.isChara = (msg.type === 'chara');
            msg.isImage = (msg.type === 'image');
            if (msg.isChara) msg.name = rpData.charas[msg.charaId].name.toUpperCase();
        });
        if (!docxTemplateRequest) {
            docxTemplateRequest = $http.get('/assets/template.docx', {responseType: 'arraybuffer'});
        }
        docxTemplateRequest.then(function(res) {
            var doc = new Docxtemplater().loadZip(new JSZip(res.data));
            doc.setData(rpData);
            doc.render();
            var blob = doc.getZip().generate({
                type: 'blob',
                mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            });
            saveAs(blob, rp.title + ".docx");
        })
    }

    return {
        saveTxt: saveTxt,
        saveDocx: saveDocx
    };

}])
