import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RpService } from './rp.service';
import * as Docxtemplater from 'docxtemplater';
import * as JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { TrackService } from '../../track.service';

@Injectable()
export class DownloadDocxService {

  constructor(
    private http: HttpClient,
    private rp: RpService,
    private track: TrackService
  ) { }

  private docxTemplateRequest = this.http.get('/assets/template.docx', {responseType: 'blob'}).toPromise();

  public downloadDocx(includeOOC: boolean) {
    this.track.event('Download', 'docx', includeOOC ? 'ooc: yes' : 'ooc: no', this.rp.messages.length);

    const data = {
      title: this.rp.title,
      desc: this.rp.desc,
      hasDesc: !!this.rp.desc,
      msgs: this.rp.messages.map(({type, content, url, charaId}) => ({
        content,
        url,
        isNarrator: (type === 'narrator'),
        isOOC: (type === 'ooc'),
        isImage: (type === 'image'),
        isChara: (type === 'chara'),
        name: (type === 'chara' ? this.rp.charasById.get(charaId).name.toUpperCase() : undefined)
      })).filter(msg => includeOOC || !msg.isOOC)
    };

    this.docxTemplateRequest.then(blob => {
      const reader = new FileReader();
      reader.onload = () => {
        const doc = new Docxtemplater().loadZip(new JSZip(reader.result));
        doc.setData(data);
        doc.render();
        const file = doc.getZip().generate({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        saveAs(file, this.rp.title + '.docx');
      };
      reader.readAsArrayBuffer(blob);
    });
  }

}
