import { Injectable, OnDestroy } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable, Observer, Subject, ReplaySubject } from 'rxjs';
import { map, filter, first, distinctUntilChanged, mapTo, pairwise } from 'rxjs/operators';
import { RpChara, RpCharaId } from '../models/rp-chara';
import { RpMessage } from '../models/rp-message';
import { RpCodeService } from './rp-code.service';

interface RpEvent {
  type: 'init' | 'append' | 'put';
  data: any;
}

interface RpState {
  title?: string;
  desc?: string;
  msgs?: RpMessage[];
  charas?: RpChara[];
  error?: { code: string };
}

@Injectable()
export class RpService implements OnDestroy {

  private readonly rpState: Subject<RpState>;

  public readonly loaded$: Observable<true>;
  public readonly error$: Observable<{ code: string }>;

  public readonly title$: Observable<string>;
  public readonly desc$: Observable<string>;

  public readonly newMessages$: Observable<RpMessage>;
  public readonly messages$: Observable<RpMessage[]>;

  public readonly charas$: Observable<RpChara[]>;
  public readonly charasById$: Observable<Map<RpCharaId, RpChara>>;

  private static initialState = () => <RpState>{};

  private static updateState(state: RpState, { type, data }: RpEvent) {
    if (type === 'init') {
      return data;
    }

    else if (type === 'append') {
      const newState = { ...state };
      for (const key in data) {
        if (Array.isArray(data[key])) {
          newState[key] = [...state[key], ...data[key]];
        }
      }
      return newState;
    }

    else if (type === 'put') {
      const newState = { ...state };
      for (const key in data) {
        if (Array.isArray(data[key])) {
          const arr = [...state[key]];
          for (const item of data[key]) {
            const index = arr.findIndex(oldItem => oldItem._id === item._id);
            if (index !== -1) arr.splice(index, 1, item);
          }
          newState[key] = arr;
        }
      }
      return newState;
    }
  }

  constructor(rpCodeService: RpCodeService) {
    // websocket events
    this.rpState = new ReplaySubject(1);
    (<Observable<RpState>>Observable.create((observer: Observer<RpState>) => {
      let state: RpState = RpService.initialState();
      observer.next(state);

      const ws = new WebSocket(`${environment.wsUrl}?rpCode=${rpCodeService.rpCode}`);

      ws.onmessage = (evt: MessageEvent) => {
        state = RpService.updateState(state, JSON.parse(evt.data));
        observer.next(state);
      };

      return () => ws.close();
    })).subscribe(this.rpState);

    this.loaded$ = this.rpState.pipe<true>(
      filter(({ msgs=null, error=null }) => !!msgs && !error),
      mapTo(true),
      first(),
    );

    this.messages$ = this.rpState.pipe(
      filter(({ msgs=null }) => !!msgs),
      map(({ msgs }) => msgs),
      distinctUntilChanged(),
    );

    this.newMessages$ = this.messages$.pipe(
      pairwise(),
      filter(([oldMsgs, newMsgs]) => oldMsgs.length < newMsgs.length),
      map(([, msgs]) => msgs[msgs.length - 1]),
    );

    this.charas$ = this.rpState.pipe(
      filter(({ charas=null }) => !!charas),
      map(({ charas }) => charas),
      distinctUntilChanged(),
    );

    this.charasById$ = this.charas$.pipe(
      map(charas => charas.reduce((charaMap, chara) => charaMap.set(chara._id, chara), new Map()))
    );

    this.title$ = this.rpState.pipe(
      filter(({ title=null }) => !!title),
      map(({ title }) => title),
      distinctUntilChanged(),
    );

    this.desc$ = this.rpState.pipe(
      filter(({ desc=null }) => !!desc),
      map(({ desc }) => desc),
      distinctUntilChanged(),
    );

    this.error$ = this.rpState.pipe(
      filter(({ error=null }) => !!error),
      map(({ error }) => error),
      distinctUntilChanged(),
    );
  }

  // because rp service is provided in rp component, this is called when navigating away from an rp
  public ngOnDestroy() {
    this.rpState.complete();
  }
}
