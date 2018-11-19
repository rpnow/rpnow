import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy, ApplicationRef } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable, Observer, Subject, ReplaySubject, Subscription } from 'rxjs';
import { map, filter, take, distinctUntilChanged, mapTo, pairwise } from 'rxjs/operators';
import { RpChara, RpCharaId } from '../models/rp-chara';
import { RpMessage } from '../models/rp-message';
import { RpCodeService } from './rp-code.service';

interface RpEvent {
  id: number;
  updates: {
    type: 'msgs' | 'charas';
    data: any;
  }[];
}

interface RpWsError {
  code: number;
  reason: string;
  wasClean?: boolean;
}

export type RpConnectionState = 'connecting' | 'loading' | 'connected' | 'offline' | 'reconnecting' | 'reloading' | 'done';

interface RpState {
  connection: RpConnectionState;
  lastEventId?: number;
  title?: string;
  desc?: string;
  msgs?: RpMessage[];
  charas?: RpChara[];
  error?: RpWsError;
}

@Injectable()
export class RpService implements OnDestroy {

  private readonly rpState: Subject<RpState>;
  private readonly subscription: Subscription;

  public readonly loaded$: Observable<true>;
  public readonly connection$: Observable<RpConnectionState>;
  public readonly error$: Observable<RpWsError>;

  public readonly title$: Observable<string>;
  public readonly desc$: Observable<string>;

  public readonly newMessages$: Observable<RpMessage>;
  public readonly messages$: Observable<RpMessage[]>;

  public readonly charas$: Observable<RpChara[]>;
  public readonly charasById$: Observable<Map<RpCharaId, RpChara>>;

  private initialState: () => RpState = () => ({ connection: 'connecting' });

  private updateState(state: RpState, { id, updates }: RpEvent): RpState {
      const newState = { ...state, lastEventId: id };

      for (const { type, data } of updates) {
        const arr = [...newState[type]];

        const index = arr.findIndex(oldItem => oldItem._id === data._id);
        if (index >= 0) arr.splice(index, 1, data);
        else arr.push(data);

        newState[type] = <any>arr;
      }

      return newState;
  }

  constructor(
    http: HttpClient,
    rpCodeService: RpCodeService
  ) {
    // websocket events
    this.rpState = new ReplaySubject(1);
    this.subscription = (<Observable<RpState>>Observable.create(async (observer: Observer<RpState>) => {
      let state: RpState = this.initialState();
      observer.next(state);

      const firstStateUpdate = await http.get(`${environment.apiUrl}/api/rp/${rpCodeService.rpCode}`).toPromise();
      state = <any>{ ...state, ...firstStateUpdate, connection: 'connected' };
      observer.next(state);

      while (true) {
        const { id, updates } = <any>(await http.get(`${environment.apiUrl}/api/rp/${rpCodeService.rpCode}/updates?lastEventId=${state.lastEventId}`).toPromise());
        state = this.updateState(state, { id, updates });
        observer.next(state);

        await new Promise(resolve => setTimeout(() => resolve(), 1000));
      }

      // const es = new EventSource(`${environment.apiUrl}/api/rp/${rpCodeService.rpCode}/stream?lastEventId=${state.lastEventId}`);

      // es.addEventListener('open', () => console.log('open'));
      // es.addEventListener('error', () => console.log('error'));
      // es.addEventListener('message', (event: any) => {
      //   state = this.updateState(state, JSON.parse(event.data));
      //   observer.next(state);
      // });




      /*



      let websocket: WebSocket;

      // ws event handlers
      const onopen = () => {
        if (state.connection === 'connecting') {
          state = { ...state, connection: 'loading' };
        } else if (state.connection === 'reconnecting') {
          state = { ...state, connection: 'reloading' };
        }
        observer.next(state);
      };

      const onmessage = (evt: MessageEvent) => {
        state = this.updateState(state, JSON.parse(evt.data));
        observer.next(state);
      };

      const onclose = ({ code, wasClean, reason }: CloseEvent) => {
        if (code === 1000) {
          state = { ...state, connection: 'done' };
          observer.next(state);
          observer.complete();
        } else if (code === 1006) {
          state = { ...state, connection: 'offline' };
          observer.next(state);
          setTimeout(() => {
            websocket = createWs();
            state = { ...state, connection: 'reconnecting' };
            observer.next(state);
          }, 5000);
        } else if (reason === 'RP_NOT_FOUND') {
          observer.next({ ...state, connection: 'done', error: { code, reason } });
          observer.complete();
        } else {
          observer.next({ ...state, connection: 'done', error: { code, wasClean, reason }});
          observer.complete();
        }
      };

      function createWs() {
        const ws = new WebSocket(`${environment.wsUrl}?rpCode=${rpCodeService.rpCode}`);
        ws.addEventListener('open', onopen);
        ws.addEventListener('message', onmessage);
        ws.addEventListener('close', onclose);
        return ws;
      }

      websocket = createWs();

      return () => websocket.close(1000, 'SPA navigation');
      */
    })).subscribe(this.rpState);

    this.connection$ = this.rpState.pipe(
      map(({ connection }) => connection),
      distinctUntilChanged(),
    );

    this.loaded$ = this.rpState.pipe<true>(
      filter(({ connection, error = null }) => connection === 'connected' && !error),
      mapTo(true),
      take(1),
    );

    this.messages$ = this.rpState.pipe(
      filter(({ msgs = null }) => !!msgs),
      map(({ msgs }) => msgs),
      distinctUntilChanged(),
    );

    this.newMessages$ = this.messages$.pipe(
      pairwise(),
      filter(([oldMsgs, newMsgs]) => oldMsgs.length < newMsgs.length),
      map(([, msgs]) => msgs[msgs.length - 1]),
    );

    this.charas$ = this.rpState.pipe(
      filter(({ charas = null }) => !!charas),
      map(({ charas }) => charas),
      distinctUntilChanged(),
    );

    this.charasById$ = this.charas$.pipe(
      map(charas => charas.reduce((charaMap, chara) => charaMap.set(chara._id, chara), new Map()))
    );

    this.title$ = this.rpState.pipe(
      filter(({ title = null }) => !!title),
      map(({ title }) => title),
      distinctUntilChanged(),
    );

    this.desc$ = this.rpState.pipe(
      filter(({ desc = null }) => !!desc),
      map(({ desc }) => desc),
      distinctUntilChanged(),
    );

    this.error$ = this.rpState.pipe(
      filter(({ error = null }) => !!error),
      map(({ error }) => error),
      distinctUntilChanged(),
    );
  }

  // because rp service is provided in rp component, this is called when navigating away from an rp
  public ngOnDestroy() {
    this.subscription.unsubscribe();
    this.rpState.complete();
  }
}
