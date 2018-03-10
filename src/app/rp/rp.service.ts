import { Injectable, OnDestroy } from '@angular/core';
import * as io from 'socket.io-client';
import { ChallengeService, Challenge } from './challenge.service'
import { API_URL } from '../app.constants';
import { Route, Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs/Subject';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';


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
  edited?: number;
  content: string;
  charaId?: number;
  challenge?: string;
  url?: string;
  ipid: string;
}

export interface RpChara {
  id: number;
  name: string;
  color: string;
}

export type RpVoice = RpChara|'narrator'|'ooc';

@Injectable()
export class RpService implements OnDestroy {

  private readonly challenge: Challenge;
  private readonly socket: SocketIOClient.Socket;

  public readonly loaded: Promise<boolean>;
  public readonly rpCode: string;
  public title: string = null;
  public desc: string = null;

  public messages: Readonly<RpMessage>[] = null;
  public messagesById: Map<number, RpMessage> = null;
  public charas: Readonly<RpChara>[] = null;
  public charasById: Map<number, RpChara> = null;

  private readonly newMessagesSubject: Subject<RpMessage> = new Subject();
  private readonly editedMessagesSubject: Subject<{msg: RpMessage, id: number}> = new Subject();

  private readonly newCharasSubject: Subject<RpChara> = new Subject();

  public readonly newMessages$: Observable<RpMessage>;
  public readonly editedMessages$: Observable<{msg: RpMessage, id: number}>;
  public readonly messages$: Observable<RpMessage[]> = new ReplaySubject(1);
  public readonly messagesById$: Observable<Map<number, RpMessage>>;

  public readonly newCharas$: Observable<RpChara>;
  public readonly charas$: Observable<RpChara[]> = new ReplaySubject(1);
  public readonly charasById$: Observable<Map<number, RpChara>>;


  constructor(challengeService: ChallengeService, route: ActivatedRoute) {

    this.rpCode = route.snapshot.paramMap.get('rpCode');
    this.challenge = challengeService.challenge;

    // socket.io events
    this.socket = io(API_URL, { query: 'rpCode='+this.rpCode });

    this.loaded = new Promise((resolve, reject) => {
      this.socket.on('load rp', () => resolve(true))
      this.socket.on('rp error', reject)
      this.socket.on('error', reject)
    });

    let firstMessages: Subject<RpMessage[]> = new Subject();
    let firstCharas: Subject<RpChara[]> = new Subject();

    this.socket.on('load rp', (data) => {
      this.title = data.title;
      this.desc = data.desc;

      firstMessages.next(data.msgs);
      firstMessages.complete();
      firstCharas.next(data.charas);
      firstCharas.complete();
    });

    this.socket.on('add message', msg => this.newMessagesSubject.next(msg));

    this.socket.on('add character', chara => this.newCharasSubject.next(chara));

    this.socket.on('edit message', data => this.editedMessagesSubject.next(data));

    // observable structure
    this.newMessages$ = this.newMessagesSubject.asObservable();

    this.editedMessages$ = this.editedMessagesSubject.asObservable();

    let messageOperations$: Observable<((msgs:RpMessage[]) => RpMessage[])> = Observable.merge(
      firstMessages.map(msgs => () => msgs),
      this.newMessages$.map(msg => (msgs: RpMessage[]) => {
        return [...msgs, msg];
      }),
      this.editedMessages$.map(({id, msg}) => (msgs: RpMessage[]) => {
        msgs.splice(id, 1, msg);
        return msgs;
      })
    )

    messageOperations$
      .scan((arr, fn) => fn(arr), <RpMessage[]>[])
      .map(msgs => msgs.map((msg, id) => ({...msg, id }))) // TODO add id on server
      .subscribe(this.messages$ as Subject<RpMessage[]>)
    
    this.messagesById$ = this.messages$.map(msgs =>
      msgs.reduce((map, msg) => map.set(msg.id, msg), new Map())
    )

    this.newCharas$ = this.newCharasSubject.asObservable();

    let charaOperations$: Observable<((charas:RpChara[]) => RpChara[])> = Observable.merge(
      firstCharas.map(charas => () => charas),
      this.newCharas$.map(chara => (charas: RpChara[]) => {
        return [...charas, chara];
      })
    )

    charaOperations$
      .scan((arr, fn) => fn(arr), <RpChara[]>[])
      .map(charas => charas.map((chara, id) => ({...chara, id }))) // TODO add id on server
      .subscribe(this.charas$ as Subject<RpChara[]>)

    this.charasById$ = this.charas$.map(charas =>
      charas.reduce((map, chara) => map.set(chara.id, chara), new Map())
    )

    // access values directly
    this.messages$.subscribe(messages => this.messages = messages);
    this.messagesById$.subscribe(messagesById => this.messagesById = messagesById);
    this.charas$.subscribe(charas => this.charas = charas);
    this.charasById$.subscribe(charasById => this.charasById = charasById);

  }

  // helper to let us 'await' on a socket emit completing
  private socketEmit(messageType: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit(messageType, data, (err, data) => err ? reject(err) : resolve(data));
    });
  }

  public async addMessage({ content, type, charaId }: {content:string, type:string, charaId?:number}) {
    let msg:RpMessage = await this.socketEmit('add message', { content, type, charaId, challenge: this.challenge.hash });
    this.newMessagesSubject.next(msg);

    return this.messages[this.messages.length-1]; // TODO we can return this directly after id is returned from server
  }

  public async addChara({ name, color }: { name: string, color: string }) {
    let chara:RpChara = await this.socketEmit('add character', { name, color });
    this.newCharasSubject.next(chara);

    return this.charas[this.charas.length-1]; // TODO we can return this directly after id is returned from server
  }

  public async addImage(url: string) {
    let msg:RpMessage = await this.socketEmit('add image', url);
    this.newMessagesSubject.next(msg);

    return this.messages[this.messages.length-1]; // TODO we can return this directly after id is returned from server
  }

  public async editMessage(id: number, content: string) {
    let msg:RpMessage = await this.socketEmit('edit message', { id, content, secret: this.challenge.secret });
    this.editedMessagesSubject.next({ msg, id });
  }

  // because rp service is provided in rp component, this is called when navigating away from an rp
  public ngOnDestroy() {
    this.socket.close();
    this.newMessagesSubject.complete();
    this.editedMessagesSubject.complete();
    this.newCharasSubject.complete();
  }

  // use in ngFor
  public trackById(item: RpMessage|RpChara) {
    return item.id;
  }

}
