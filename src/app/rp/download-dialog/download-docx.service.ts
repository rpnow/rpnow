import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'
import { Rp } from '../../rp.service';
import * as Docxtemplater from 'docxtemplater';
import * as JSZip from 'jszip';
import { saveAs } from 'file-saver';

@Injectable()
export class DownloadDocxService {

  constructor(private http: HttpClient) { }

  private docxTemplateRequest = this.http.get('/assets/template.docx', {responseType: 'blob'}).toPromise();

  public downloadDocx(rp: Rp, includeOOC: boolean) {
    let data = {
      title: rp.title,
      desc: rp.desc,
      hasDesc: !!rp.desc,
      msgs: rp.messages.map(({type, content, url, chara}) => ({
        content, 
        url, 
        isNarrator: (type === 'narrator'),
        isOOC: (type === 'ooc'),
        isImage: (type === 'image'),
        isChara: (type === 'chara'),
        name: (chara ? chara.name.toUpperCase() : undefined)
      })).filter(msg => includeOOC || !msg.isOOC)
    }

    this.docxTemplateRequest.then(blob => {
      let reader = new FileReader();
      reader.onload = () => {
        let doc = new Docxtemplater().loadZip(new JSZip(reader.result));
        doc.setData(data);
        doc.render();
        let file = doc.getZip().generate({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        saveAs(file, rp.title + '.docx');;
      }
      reader.readAsArrayBuffer(blob);
    })
  }

}
