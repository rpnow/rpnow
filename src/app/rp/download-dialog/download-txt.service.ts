import { Injectable } from '@angular/core';
import { Rp } from '../rp.service';
import * as wrap from 'word-wrap';
import { saveAs } from 'file-saver';

@Injectable()
export class DownloadTxtService {

  constructor() { }

  public downloadTxt(rp: Rp, includeOOC: boolean) {
    // get rp formatted text
    let text = this.rpText(rp, includeOOC)
    
    // windows-compatible newlines
    text = text.replace('\n', '\r\n');

    // save as file
    let blob = new Blob([text], { type: 'text/plain;charset=utf-8'});
    saveAs(blob, `${rp.title}.txt`);
  }

  private rpText(rp: Rp, includeOOC: boolean): string {
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
