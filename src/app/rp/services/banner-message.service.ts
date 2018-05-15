import { Injectable } from '@angular/core';
import { of } from 'rxjs/observable/of';

@Injectable()
export class BannerMessageService {

  public message$ = of(
    'This is the beta version of RPNow. Please report problems to <a href="mailto:rpnow.net@gmail.com">rpnow.net@gmail.com</a>!'
  );

}
