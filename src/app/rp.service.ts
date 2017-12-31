import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import { Observable } from 'rxjs/Rx';
import { Subject } from 'rxjs/Rx';
import { BehaviorSubject } from 'rxjs/Rx';
import { ConnectableObservable } from 'rxjs/Rx';
import { Subscription } from 'rxjs/Subscription';

interface SocketEvent {type: string, data: any}

const URL = 'http://localhost:3000';

const MESSAGE_TYPES = ['load rp', 'add message', 'add chara', 'edit message'];
const ERROR_MESSAGE_TYPES = ['rp error', 'error'];

@Injectable()
export class RpService {

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

  public join(rpCode: string) {
    return new Promise((resolve, reject) => {
      let roomEvents$ = this.createRpObservable(rpCode)
        .multicast(() => new Subject())
      
      let rp = new Rp(roomEvents$, roomEvents$.connect());

      roomEvents$.subscribe(
        () => resolve(rp),
        (err) => reject(err)
      )

    })
  }

}

export class Rp {
  public title$: Subject<string> = new BehaviorSubject(null);
  public desc$: Subject<string> = new BehaviorSubject(null);
  public messages$: Subject<any[]> = new BehaviorSubject(null);
  public charas$: Subject<any[]> = new BehaviorSubject(null);

  constructor(private roomEvents$: Observable<SocketEvent>, private subscription: Subscription) {
    let initialRp$ = this.roomEvents$.filter(evt => evt.type === 'load rp').pluck('data');

    initialRp$.pluck('title').subscribe(this.title$);
    initialRp$.pluck('desc').subscribe(this.desc$);
    initialRp$.pluck('msgs').subscribe(this.messages$);
    initialRp$.pluck('charas').subscribe(this.charas$);

  }

  public close() {
    this.subscription.unsubscribe();
  }
}
