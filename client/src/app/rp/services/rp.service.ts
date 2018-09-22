import { Injectable, OnDestroy } from '@angular/core';
import { ChallengeService, Challenge } from './challenge.service';
import { environment } from '../../../environments/environment';
import { Subject, ReplaySubject, Observable, merge } from 'rxjs';
import { map, scan, filter, first } from 'rxjs/operators';
import { TrackService } from '../../track.service';
import { RpChara, RpCharaId } from '../models/rp-chara';
import { RpMessage, RpMessageId } from '../models/rp-message';
import { RpVoice, typeFromVoice } from '../models/rp-voice';
import { RpCodeService } from './rp-code.service';
import { HttpClient } from '@angular/common/http';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';


@Injectable()
export class RpService implements OnDestroy {

  private readonly challenge: Challenge;
  private readonly socket$: WebSocketSubject<{type: string, data: any }>;

  public readonly loaded: Promise<boolean>;
  public readonly notFound: Promise<boolean>;
  public readonly rpCode: string;
  public title: string = null;
  public desc: string = null;

  public messages: Readonly<RpMessage>[] = null;
  public messagesById: Map<RpMessageId, RpMessage> = null;
  public charas: Readonly<RpChara>[] = null;
  public charasById: Map<RpCharaId, RpChara> = null;

  private readonly newMessagesSubject: Subject<RpMessage> = new Subject();
  private readonly editedMessagesSubject: Subject<RpMessage> = new Subject();

  private readonly newCharasSubject: Subject<RpChara> = new Subject();

  public readonly newMessages$: Observable<RpMessage>;
  public readonly editedMessages$: Observable<RpMessage>;
  public readonly messages$: Observable<RpMessage[]> = new ReplaySubject(1);
  public readonly messagesById$: Observable<Map<RpMessageId, RpMessage>>;

  public readonly newCharas$: Observable<RpChara>;
  public readonly charas$: Observable<RpChara[]> = new ReplaySubject(1);
  public readonly charasById$: Observable<Map<RpCharaId, RpChara>>;

  constructor(
    private http: HttpClient,
    challengeService: ChallengeService,
    rpCodeService: RpCodeService,
    private track: TrackService
  ) {

    this.rpCode = rpCodeService.rpCode;
    this.challenge = challengeService.challenge;

    // websocket events
    this.socket$ = webSocket<{type: string, data: any }>(`${environment.wsUrl}?rpCode=${this.rpCode}`);

    this.loaded = this.socket$.pipe(
      filter(({ type }) => type === 'load rp' || type === 'rp error'),
      map(({ type }) => type === 'load rp'),
      first(),
    ).toPromise();

    this.notFound = this.loaded.then(loaded => !loaded);

    const firstMessages: Subject<RpMessage[]> = new Subject();
    const firstCharas: Subject<RpChara[]> = new Subject();

    this.socket$.subscribe(({type, data}) => {
      if (type === 'load rp') {
        this.title = data.title;
        this.desc = data.desc;

        firstMessages.next(data.msgs);
        firstMessages.complete();
        firstCharas.next(data.charas);
        firstCharas.complete();
      }

      else if (type === 'add message') {
        this.newMessagesSubject.next(data);
      }

      else if (type === 'add character') {
        this.newCharasSubject.next(data);
      }

      else if (type === 'edit message') {
        this.editedMessagesSubject.next(data);
      }
    });

    // observable structure
    this.newMessages$ = this.newMessagesSubject.asObservable();

    this.editedMessages$ = this.editedMessagesSubject.asObservable();

    const messageOperations$: Observable<(msgs: RpMessage[]) => RpMessage[]> = merge(
      firstMessages.pipe(
        map(msgs => () => msgs)
      ),
      this.newMessages$.pipe(
        map(msg => (msgs: RpMessage[]) => [...msgs, msg])
      ),
      this.editedMessages$.pipe(
        map(msg => (msgs: RpMessage[]) => {
          const index = msgs.findIndex(m => m._id === msg._id);
          if (index !== -1) msgs.splice(index, 1, msg);
          return msgs;
        })
      )
    );

    messageOperations$.pipe(
      scan((arr, fn: (msgs: RpMessage[]) => RpMessage[]) => fn(arr), <RpMessage[]>[]),
    ).subscribe(
      this.messages$ as Subject<RpMessage[]>
    );

    this.messagesById$ = this.messages$.pipe(
      map(msgs => msgs.reduce((msgMap, msg) => msgMap.set(msg._id, msg), new Map()))
    );

    this.newCharas$ = this.newCharasSubject.asObservable();

    const charaOperations$: Observable<((charas: RpChara[]) => RpChara[])> = merge(
      firstCharas.pipe(
        map(charas => () => charas)
      ),
      this.newCharas$.pipe(
        map(chara => (charas: RpChara[]) => [...charas, chara])
      )
    );

    charaOperations$.pipe(
      scan((arr, fn: {(charas)}) => fn(arr), <RpChara[]>[]),
    ).subscribe(
      this.charas$ as Subject<RpChara[]>
    );

    this.charasById$ = this.charas$.pipe(
      map(charas => charas.reduce((charaMap, chara) => charaMap.set(chara._id, chara), new Map()))
    );

    // access values directly
    this.messages$.subscribe(messages => this.messages = messages);
    this.messagesById$.subscribe(messagesById => this.messagesById = messagesById);
    this.charas$.subscribe(charas => this.charas = charas);
    this.charasById$.subscribe(charasById => this.charasById = charasById);

  }

  // because rp service is provided in rp component, this is called when navigating away from an rp
  public ngOnDestroy() {
    this.socket$.complete();
    this.newMessagesSubject.complete();
    this.editedMessagesSubject.complete();
    this.newCharasSubject.complete();
  }

  async addMessage(content: string, voice: RpVoice) {
    const msg: Partial<RpMessage> = {
      content,
      ... typeFromVoice(voice),
      challenge: this.challenge.hash
    };
    this.track.event('Messages', 'create', msg.type, content.length);

    const receivedMsg: RpMessage = await this.http.post(`${environment.apiUrl}/api/rp/${this.rpCode}/message`, msg).toPromise() as any;
    this.newMessagesSubject.next(receivedMsg);

    return receivedMsg;
  }

  async addChara(name: string, color: string) {
    const chara: Partial<RpChara> = {
      name,
      color
    };
    this.track.event('Charas', 'create');

    const receivedChara: RpChara = await this.http.post(`${environment.apiUrl}/api/rp/${this.rpCode}/chara`, chara).toPromise() as any;
    this.newCharasSubject.next(receivedChara);

    return receivedChara;
  }

  async addImage(url: string) {
    const msg = { url };
    this.track.event('Messages', 'create', 'image');

    const receivedMsg: RpMessage = await this.http.post(`${environment.apiUrl}/api/rp/${this.rpCode}/image`, msg).toPromise() as any;
    this.newMessagesSubject.next(receivedMsg);

    return receivedMsg;
  }

  async editMessage(id: RpMessageId, content: string) {
    const editInfo = {
      id,
      content,
      secret: this.challenge.secret
    };
    this.track.event('Messages', 'edit', null, content.length);

    const msg: RpMessage = await this.http.patch(`${environment.apiUrl}/api/rp/${this.rpCode}/message`, editInfo).toPromise() as any;
    this.editedMessagesSubject.next(msg);
  }

}
