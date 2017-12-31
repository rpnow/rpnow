import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import { ChallengeService } from './challenge.service'

const URL = 'http://localhost:3000';

const MESSAGE_TYPES = ['load rp', 'add message', 'add character', 'edit message'];
const ERROR_MESSAGE_TYPES = ['rp error', 'error'];

@Injectable()
export class RpService {

  constructor(private challengeService: ChallengeService) { }

  public async join(rpCode: string) {
    let rp = new Rp(rpCode, this.challengeService.challenge$);
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
  public messages: any[] = null;
  public charas: any[] = null;

  constructor(public rpCode: string, private challenge$: Promise<{secret:string, hash:string}>) {
    this.socket = io(URL, { query: 'rpCode='+rpCode });

    this.socket.on('load rp', (data) => {
      this.title = data.title;
      this.desc = data.desc;
      this.messages = data.msgs;
      this.charas = data.charas;
    });

    this.socket.on('add message', (msg) => {
      this.messages.push(msg);
    });

    this.socket.on('add character', (chara) => {
      this.charas.push(chara);
    });

    this.socket.on('edit message', (data) => {
      console.log(data)
      this.messages.splice(data.id, 1, data.msg);
    });

    this.loaded = new Promise((resolve, reject) => {
      this.socket.on('load rp', () => resolve())
      this.socket.on('rp error', reject)
      this.socket.on('error', reject)
    });
  }

  public async addMessage(msg: any) {
    let placeholder = JSON.parse(JSON.stringify(msg));
    placeholder.sending = true;
    this.messages.push(placeholder);

    let challenge = await this.challenge$;
    msg.challenge = challenge.hash;

    let receivedMsg = await promiseFromEmit(this.socket, 'add message', msg);
    this.messages.splice(this.messages.indexOf(placeholder), 1);
    this.messages.push(receivedMsg);

    return receivedMsg;
  }

  public async addChara(chara: any) {
    let receivedChara = await promiseFromEmit(this.socket, 'add character', chara);
    this.charas.push(receivedChara);

    return receivedChara;
  }

  public async addImage(url: string) {
    let receivedMsg = await promiseFromEmit(this.socket, 'add image', url);
    this.messages.push(receivedMsg);

    return receivedMsg;
  }

  public async editMessage(id: number, content: string) {
    let secret = (await this.challenge$).secret;
    let editInfo = { id, content, secret };

    let receivedMsg = await promiseFromEmit(this.socket, 'edit message', editInfo);
    this.messages.splice(id, 1, receivedMsg);
  }

  public close() {
    this.socket.close();
  }
}
