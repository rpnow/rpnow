import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import { ChallengeService, Challenge } from './challenge.service'

const URL = 'http://localhost:3000';

export class RpMessage {
  type: 'narrator'|'ooc'|'chara'|'image' = null;
  timestamp: number = null;
  sending: boolean = false;
  content: string = null;
  charaId?: number = null;
  challenge?: string = null;
  url?: string = null;

  constructor(data:any, private rp:Rp) {
    for (let prop in data) this[prop] = data[prop];
  }

  get id() {
    return this.rp.messages.indexOf(this);
  }

  get chara() {
    return this.rp.charas[this.charaId];
  }

  get canEdit() {
    return this.rp.canEditMessage(this.id);
  }

  get color() {
    return this.chara ? this.chara.color : null;
  }

  async edit(newContent: string) {
    this.sending = true;
    this.content = newContent;

    await this.rp.editMessage(this.id, newContent);
    this.sending = false;
  }

}

export class RpChara {
  name: string = null;
  color: string = null;

  constructor(data:any, private rp:Rp) {
    for (let prop in data) this[prop] = data[prop];
  }

  get id() {
    return this.rp.charas.indexOf(this);
  }
}

@Injectable()
export class RpService {
  constructor(
    private challengeService: ChallengeService
  ) { }

  public async join(rpCode: string) {
    let rp = new Rp(rpCode, this.challengeService.challenge);
    await rp.loaded;
    return rp;
  }
}

function promiseFromEmit(socket: SocketIOClient.Socket, messageType: string, data: any) {
  return new Promise((resolve, reject) => {
    socket.emit(messageType, data, (err, data) => err ? reject(err) : resolve(data));
  });
}

export class Rp {
  private socket: SocketIOClient.Socket;

  public loaded: Promise<void>;

  public title: string = null;
  public desc: string = null;
  public messages: RpMessage[] = null;
  public charas: RpChara[] = null;

  constructor(public rpCode: string, private challenge: Challenge) {
    this.socket = io(URL, { query: 'rpCode='+rpCode });

    this.socket.on('load rp', (data) => {
      this.title = data.title;
      this.desc = data.desc;
      this.messages = data.msgs.map(data => new RpMessage(data, this));
      this.charas = data.charas.map(data => new RpChara(data, this));
    });

    this.socket.on('add message', (msg) => {
      this.messages.push(new RpMessage(msg, this));
    });

    this.socket.on('add character', (chara) => {
      this.charas.push(new RpChara(chara, this));
    });

    this.socket.on('edit message', (data) => {
      this.messages.splice(data.id, 1, new RpMessage(data.msg, this));
    });

    this.loaded = new Promise((resolve, reject) => {
      this.socket.on('load rp', () => resolve())
      this.socket.on('rp error', reject)
      this.socket.on('error', reject)
    });
  }

  public async addMessage(msg: any) {
    let placeholder = new RpMessage(msg, this);
    placeholder.sending = true;
    this.messages.push(placeholder);

    msg.challenge = this.challenge.hash;

    let data = await promiseFromEmit(this.socket, 'add message', msg);
    let receivedMsg = new RpMessage(data, this);
    this.messages.splice(this.messages.indexOf(placeholder), 1);
    this.messages.push(receivedMsg);

    return receivedMsg;
  }

  public async addChara(chara: any) {
    let data = await promiseFromEmit(this.socket, 'add character', chara);
    let receivedChara = new RpChara(data, this);
    this.charas.push(receivedChara);

    return receivedChara;
  }

  public async addImage(url: string) {
    let data = await promiseFromEmit(this.socket, 'add image', url);
    let receivedMsg = new RpMessage(data, this);
    this.messages.push(receivedMsg);

    return receivedMsg;
  }

  public async editMessage(id: number, content: string) {
    let secret = this.challenge.secret;
    let editInfo = { id, content, secret };

    let data = await promiseFromEmit(this.socket, 'edit message', editInfo);
    for (let prop in data) this.messages[id][prop] = data[prop];
  }

  public canEditMessage(id: number) {
    return this.messages[id].challenge === this.challenge.hash;
  }

  public close() {
    this.socket.close();
  }
}
