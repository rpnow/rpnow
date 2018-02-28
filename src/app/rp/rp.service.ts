import { Injectable, OnDestroy } from '@angular/core';
import * as io from 'socket.io-client';
import { ChallengeService, Challenge } from './challenge.service'
import { API_URL } from '../app.constants';
import { Route, Router, ActivatedRoute } from '@angular/router';
import { Subject, BehaviorSubject, Observable } from 'rxjs/Rx';

  // async edit(newContent: string) {
  //   this.sending = true;
  //   this.content = newContent;

  //   await this.rp.editMessage(this.id, newContent);
  //   this.sending = false;
  // }

    // let placeholder = new RpMessage(msg, this);
    // placeholder.sending = true;
    // this.messages.push(placeholder);

    // msg.challenge = this.challenge.hash;

    // // ...

    // this.messages.splice(this.messages.indexOf(placeholder), 1);



export interface RpMessage {
  id: number;
  type: 'narrator'|'ooc'|'chara'|'image';
  timestamp: number;
  sending: boolean;
  content: string;
  charaId?: number;
  challenge?: string;
  url?: string;
  ip: string;
}

export interface RpChara {
  id: number;
  name: string;
  color: string;
}

export type RpVoice = RpChara|'narrator'|'ooc';

@Injectable()
export class RpService implements OnDestroy {

  public rpCode: string;
  private challenge: Challenge;

  private socket: SocketIOClient.Socket;

  public loaded: Promise<void>;

  public title: string = null;
  public desc: string = null;
  public messages: RpMessage[] = null;
  public charas: RpChara[] = null;

  constructor(challengeService: ChallengeService, route: ActivatedRoute) {

    this.rpCode = route.snapshot.paramMap.get('rpCode');
    this.challenge = challengeService.challenge;

    this.socket = io(API_URL, { query: 'rpCode='+this.rpCode });

    this.socket.on('load rp', (data) => {
      this.title = data.title;
      this.desc = data.desc;
      this.messages = data.msgs;
      this.charas = data.charas;

      this.messages.forEach((msg, id) => msg.id = id); // TODO add id on server
      this.charas.forEach((chara, id) => chara.id = id); // TODO add id on server
    });

    this.socket.on('add message', (msg:RpMessage) => {
      this.messages.push(msg);

      msg.id = this.messages.indexOf(msg); // TODO add id on server
    });

    this.socket.on('add character', (chara:RpChara) => {
      this.charas.push(chara);

      chara.id = this.charas.indexOf(chara); // TODO add id on server
    });

    this.socket.on('edit message', ({msg, id}:{msg:RpMessage, id:number}) => {
      this.messages.splice(id, 1, msg);

      msg.id = this.messages.indexOf(msg); // TODO add id on server
    });

    this.loaded = new Promise((resolve, reject) => {
      this.socket.on('load rp', () => resolve())
      this.socket.on('rp error', reject)
      this.socket.on('error', reject)
    });

  }

  private socketEmit(messageType: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit(messageType, data, (err, data) => err ? reject(err) : resolve(data));
    });
  }

  public async addMessage({ content, type, charaId }: {content:string, type:string, charaId?:number}) {
    let msg = await this.socketEmit('add message', { content, type, charaId, challenge: this.challenge.hash });
    this.messages.push(msg);

    msg.id = this.messages.indexOf(msg); // TODO add id on server

    return msg;
  }

  public async addChara({ name, color }: { name: string, color: string }) {
    let chara  = await this.socketEmit('add character', { name, color });
    this.charas.push(chara);

    chara.id = this.charas.indexOf(chara); // TODO add id on server

    return chara;
  }

  public async addImage(url: string) {
    let receivedMsg  = await this.socketEmit('add image', url);
    this.messages.push(receivedMsg);

    receivedMsg.id = this.messages.indexOf(receivedMsg); // TODO add id on server

    return receivedMsg;
  }

  public async editMessage(id: number, content: string) {
    let secret = this.challenge.secret;
    let editInfo = { id, content, secret };

    let data = await this.socketEmit('edit message', editInfo);
    for (let prop in data) this.messages[id][prop] = data[prop];
  }

  public canEditMessage(id: number) {
    return this.messages[id].challenge === this.challenge.hash;
  }

  public ngOnDestroy() {
    this.socket.close();
  }

}
