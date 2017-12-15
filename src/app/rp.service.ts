import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import * as io from 'socket.io-client';

@Injectable()
export class RpService {
  constructor() {}

  private readonly URL = 'http://localhost:3000';

  getRp(rpCode): Observable<string> {
    return new Observable(observer => {
      let socket = io(this.URL, { query: 'rpCode='+rpCode });

      socket.on('rp error', err => observer.error(err))

      socket.on('load rp', data => observer.next(data))

      socket.on('add message', data => observer.next(data))

      return () => socket.close();
    })
  }

}
