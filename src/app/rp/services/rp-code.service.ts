import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Injectable()
export class RpCodeService {

  rpCode: string;

  constructor(route: ActivatedRoute) {
    this.rpCode = route.snapshot.paramMap.get('rpCode');
  }

}
