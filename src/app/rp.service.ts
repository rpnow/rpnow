import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

interface SocketEvent {type: string, data: any}

const URL = 'http://localhost:3000';

const MESSAGE_TYPES = ['load rp', 'add message', 'add chara', 'edit message'];
const ERROR_MESSAGE_TYPES = ['rp error', 'error'];

@Injectable()
export class RpService {
  private rpCode$: BehaviorSubject<string> = new BehaviorSubject(null);

  private roomEvents$: Observable<SocketEvent>;
  private _roomEventsSubject: Subject<any> = new Subject(); // used for the multicast() call in creating the roomEvents$ observable

  private initialRp$: Observable<any>;

  public title$: Observable<string>;
  public desc$: Observable<string>;
  public messages$: Observable<any[]>;
  public charas$: Observable<any[]>;

  constructor() {
    this.roomEvents$ = this.rpCode$.switchMap(rpCode => this.createRpObservable(rpCode)).multicast(this._roomEventsSubject).refCount();

    this.initialRp$ = this.roomEvents$.filter(evt => evt.type === 'load rp').pluck('data');

    this.title$ = this.initialRp$.pluck('title');
    this.desc$ = this.initialRp$.pluck('desc');
    this.messages$ = this.initialRp$.pluck('msgs'); // TODO use .scan to add messages
    this.charas$ = this.initialRp$.pluck('charas'); // TODO use .scan to add charas
  }

  public join(rpCode: string) {
    this.rpCode$.next(rpCode);
  }

  private createRpObservable(rpCode): Observable<SocketEvent> {
    return new Observable(observer => {
      let socket = io(URL, { query: 'rpCode='+rpCode });

      MESSAGE_TYPES.forEach(type => {
        socket.on(type, data => observer.next({type, data}));
      });
      ERROR_MESSAGE_TYPES.forEach(type => {
        socket.on(type, data => observer.error({type, data}));
      })

      return () => socket.close();
    })
  }

}
