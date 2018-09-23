import { Injectable, OnDestroy } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { map, scan, filter, first, distinctUntilChanged, tap, shareReplay } from 'rxjs/operators';
import { RpChara, RpCharaId } from '../models/rp-chara';
import { RpMessage } from '../models/rp-message';
import { RpCodeService } from './rp-code.service';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

interface RpEvent {
  type: 'init' | 'append' | 'put' | 'error';
  data: any;
}

interface RpState {
  title?: string;
  desc?: string;
  msgs?: RpMessage[];
  charas?: RpChara[];
}

@Injectable()
export class RpService implements OnDestroy {

  private readonly socketSubject: WebSocketSubject<RpEvent>;

  public readonly loaded: Promise<boolean>;
  public readonly notFound: Promise<boolean>;

  public readonly title$: Observable<string>;
  public readonly desc$: Observable<string>;

  public readonly newMessages$: Observable<RpMessage>;
  public readonly messages$: Observable<RpMessage[]>;

  public readonly charas$: Observable<RpChara[]>;
  public readonly charasById$: Observable<Map<RpCharaId, RpChara>>;

  constructor(rpCodeService: RpCodeService) {
    // websocket events
    this.socketSubject = webSocket<RpEvent>(`${environment.wsUrl}?rpCode=${rpCodeService.rpCode}`);

    const socket$ = this.socketSubject.pipe(
      shareReplay(1),
    )

    this.loaded = socket$.pipe(
      filter(({ type }) => type === 'init' || type === 'error'),
      map(({ type }) => type === 'init'),
      first(),
    ).toPromise();

    this.notFound = this.loaded.then(loaded => !loaded);

    const stateOperations$ = socket$.pipe<(state: RpState) => RpState>(
      map(({type, data}) => (state: RpState) => {
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

        else if (type === 'error') {
          // TODO handle error
        }
      }),
    );

    const state$ = stateOperations$.pipe<RpState>(
      scan((state, fn: (state: RpState) => RpState) => fn(state), {}),
      shareReplay(1),
    );

    this.newMessages$ = socket$.pipe(
      filter(({ type, data }) => type === 'append' && data.msgs),
      map(({ data }) => data.msgs[0])
    );

    this.messages$ = state$.pipe(
      filter(({ msgs=null }) => !!msgs),
      map(({ msgs }) => msgs),
      distinctUntilChanged(),
    );

    this.charas$ = state$.pipe(
      filter(({ charas=null }) => !!charas),
      map(({ charas }) => charas),
      distinctUntilChanged(),
    );

    this.title$ = state$.pipe(
      filter(({ title=null }) => !!title),
      map(({ title }) => title),
      distinctUntilChanged(),
    );

    this.desc$ = state$.pipe(
      filter(({ desc=null }) => !!desc),
      map(({ desc }) => desc),
      distinctUntilChanged(),
    );

    this.charasById$ = this.charas$.pipe(
      map(charas => charas.reduce((charaMap, chara) => charaMap.set(chara._id, chara), new Map()))
    );
  }

  // because rp service is provided in rp component, this is called when navigating away from an rp
  public ngOnDestroy() {
    this.socketSubject.complete();
  }
}
