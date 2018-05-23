/*
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { RpMessage, RpMessageId } from '../models/rp-message';
import { RpChara } from '../models/rp-chara';
import { of } from 'rxjs/observable/of';
import { interval } from 'rxjs/observable/interval';
import { delay, map } from 'rxjs/operators';
import { Observer } from 'rxjs/Observer';
import * as io from 'socket.io-client';
import { API_URL } from '../../app.constants';
import { RpVoice, typeFromVoice } from '../models/rp-voice';
import { TrackService } from '../../track.service';

interface RpPageResponse {
  title: string;
  desc: string|null;
  messages: RpMessage[];
  charas: RpChara[];
}

@Injectable()
export class RoomService {

  constructor(
    private track: TrackService
  ) {}

  getChatStream(rpCode: string): Observable<Partial<RpPageResponse>> {
    return Observable.create((observer: Observer<string>) => {
      const socket = io(`${API_URL}/room`, { query: `rpCode=${rpCode}` });

      socket.on('message', message => {
        if (message.error) {
          observer.error(message.error);
        } else {
          observer.next(message);
        }
      });

      return () => socket.close();
    });
  }

  getPage(rpCode: string, page: number): Observable<RpPageResponse> {
    return of({
      title: 'FAKE TITLE',
      desc: null,
      messages: [],
      charas: []
    }).pipe(
      delay(250)
    );
  }

  async addMessage(content: string, voice: RpVoice, challenge: string) {
    const msg: RpMessage = {
      id: null,
      createdAt: new Date().toISOString(),
      content,
      ... typeFromVoice(voice),
      challenge
    };
    this.track.event('Messages', 'create', msg.type, content.length);

    await this.db.put(msg);
  }

  async addChara(name: string, color: string) {
    const chara: RpChara = {
      id: null,
      createdAt: new Date().toISOString(),
      name,
      color
    };
    this.track.event('Charas', 'create');

    await this.db.put(chara);
    return chara;
  }

  async addImage(url: string, challenge: string) {
    const msg: RpMessage = {
      id: null,
      createdAt: new Date().toISOString(),
      type: 'image',
      url,
      challenge
    };
    this.track.event('Messages', 'create', 'image');

    await this.db.put(msg);
  }

  async editMessage(id: RpMessageId, content: string) {
    const msg: RpMessage = {
      ...((await this.db.get(id)) as RpMessage),
      content,
      editedAt: new Date().toISOString()
    };
    this.track.event('Messages', 'edit', null, content.length);

    await this.db.put(msg);
    return msg;
  }

}
*/
