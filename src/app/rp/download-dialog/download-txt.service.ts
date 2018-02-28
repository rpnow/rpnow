import { Injectable } from '@angular/core';
import * as wrap from 'word-wrap';
import { saveAs } from 'file-saver';
import { RpService } from '../rp.service';

@Injectable()
export class DownloadTxtService {

  constructor(private rp: RpService) { }

  public downloadTxt(includeOOC: boolean) {
    // get rp formatted text
    let text = this.rpText(this.rp, includeOOC)
    
    // windows-compatible newlines
    text = text.replace('\n', '\r\n');

    // save as file
    let blob = new Blob([text], { type: 'text/plain;charset=utf-8'});
    saveAs(blob, `${this.rp.title}.txt`);
  }

  private rpText(rp: RpService, includeOOC: boolean): string {
    // get messages
    let msgs = rp.messages;

    // ignore ooc messages if so desired
    if (!includeOOC) msgs = msgs.filter(msg => msg.type !== 'ooc');

    // word-wrap and format all messages
    let out = msgs.map(msg => {
      if (msg.type === 'narrator') {
        return wrap(msg.content, { width: 72, indent: '', cut: true });
      }

      else if (msg.type === 'ooc') {
        return wrap(`(( OOC: ${msg.content} ))`, { width: 72, indent: '', cut: true });
      }

      else if (msg.type === 'chara') {
        return rp.charas[msg.charaId].name.toUpperCase()+':\n'+
          wrap(msg.content, { width: 70, indent: '  ', cut: true })
      }

      else if (msg.type === 'image') {
        return `--- IMAGE ---\n${msg.url}\n-------------`;
      }

      else {
        throw new Error(`Unexpected message type: ${msg.type}`);
      }
    })

    // add title/desc to beginning
    out.unshift(`${rp.title}\n${rp.desc||''}\n----------`);

    // done
    return out.join('\n\n');
  }
}
