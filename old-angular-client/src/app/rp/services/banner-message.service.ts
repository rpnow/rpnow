import { Injectable } from '@angular/core';
import { of } from 'rxjs';

@Injectable()
export class BannerMessageService {

  public message$ = of(
    'By using RPNow, you agree to its <a target="_blank" href="/terms">terms of use.</a>'
  );

}
