import { Injectable } from '@angular/core';
import * as wrap from 'word-wrap';
import { saveAs } from 'file-saver';
import { RpService } from './rp.service';
import { TrackService } from '../../track.service';

@Injectable()
export class DownloadTxtService {

  constructor(
    private rp: RpService,
    private track: TrackService
  ) { }

  public downloadTxt(includeOOC: boolean) {
    this.track.event('Download', 'txt', includeOOC ? 'ooc: yes' : 'ooc: no', this.rp.messages.length);

    // get rp formatted text
    const text = this.rpText(this.rp, includeOOC);

    // save as file
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8'});
    saveAs(blob, `${this.rp.title}.txt`);
  }

  private rpText(rp: RpService, includeOOC: boolean): string {
    // get messages
    let msgs = rp.messages;

    // ignore ooc messages if so desired
    if (!includeOOC) msgs = msgs.filter(msg => msg.type !== 'ooc');

    // header format
    const header = `${rp.title}\n${rp.desc || ''}\n----------`;

    // word-wrap and format all messages
    const body = msgs.map(msg => {
      if (msg.type === 'narrator') {
        return wrap(msg.content, { width: 72, indent: '', cut: true });
      } else if (msg.type === 'ooc') {
        return wrap(`(( OOC: ${msg.content} ))`, { width: 72, indent: '', cut: true });
      } else if (msg.type === 'chara') {
        return rp.charasById.get(msg.charaId).name.toUpperCase() + ':\n' +
          wrap(msg.content, { width: 70, indent: '  ', cut: true });
      } else if (msg.type === 'image') {
        return `--- IMAGE ---\n${msg.url}\n-------------`;
      } else {
        throw new Error(`Unexpected message type: ${msg.type}`);
      }
    });

    // contents of the text file
    const fileContents = [ header, ...body ]
      .join('\n\n') // double newlines separate each piece
      .replace(/\n/g, '\r\n'); // format it for windows

    // done
    return fileContents;
  }
}
