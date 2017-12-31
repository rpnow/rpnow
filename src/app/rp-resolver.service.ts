import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { RpService } from './rp.service';

@Injectable()
export class RpResolverService implements Resolve<any> {
  constructor(
    private service: RpService
  ) { }

  resolve(route: ActivatedRouteSnapshot) {
    let rpCode = route.paramMap.get('rpCode');
    return this.service.join(rpCode);
  }

}
