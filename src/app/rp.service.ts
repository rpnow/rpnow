import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';

@Injectable()
export class RpService {

  constructor() { }

  getRp(rpCode): Observable<string> {
    return of('rp ' + rpCode);
  }

}
