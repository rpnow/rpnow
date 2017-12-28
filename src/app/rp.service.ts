import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

interface SocketEvent {type: string, data: any}

@Injectable()
export class RpService {
  private readonly URL = 'http://localhost:3000';

  private rpCode$: BehaviorSubject<string> = new BehaviorSubject(null);

  private roomEvents$: Observable<SocketEvent>;

  private initialRp$: Observable<SocketEvent>;

  public title$: Observable<string>;
  public desc$: Observable<string>;
  public messages$: Observable<any[]>;
  public charas$: Observable<any[]>;

  constructor() {
    this.roomEvents$ = this.rpCode$.switchMap(rpCode => this.createRpObservable(rpCode));

    this.initialRp$ = this.roomEvents$.filter(evt => evt.type === 'load rp').map(evt => evt.data);

    this.title$ = this.initialRp$.map((rp:any) => rp.title);
    this.desc$ = this.initialRp$.map((rp:any) => rp.desc);
    this.messages$ = this.initialRp$.map((rp:any) => rp.msgs); // TODO use .scan to add messages
    this.charas$ = this.initialRp$.map((rp:any) => rp.charas); // TODO use .scan to add charas
  }

  public join(rpCode: string) {
    this.rpCode$.next(rpCode);
  }

  private createRpObservable(rpCode): Observable<SocketEvent> {
    return new Observable(observer => {
      let socket = io(this.URL, { query: 'rpCode='+rpCode });

      ['load rp', 'add message', 'add chara', 'edit message'].forEach(type => {
        socket.on(type, data => observer.next({type, data}));
      });
      ['rp error', 'error'].forEach(type => {
        socket.on(type, data => observer.error({type, data}));
      })

      return () => socket.close();
    })
  }

}
