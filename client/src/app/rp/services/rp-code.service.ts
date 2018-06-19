import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Injectable()
export class RpCodeService {

  constructor(private route: ActivatedRoute) {}

  rpCode = this.rpCode = this.route.snapshot.paramMap.get('rpCode');

}
