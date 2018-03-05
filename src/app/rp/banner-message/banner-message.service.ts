import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class BannerMessageService {

  public message$ = Observable.of(
    `This is the beta version of RPNow. Please report problems to <a href="mailto:rpnow.net@gmail.com">rpnow.net@gmail.com</a>!`
  )

}
