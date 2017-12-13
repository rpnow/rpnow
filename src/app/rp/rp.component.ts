import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/switchMap';
import { RpService } from '../rp.service';

@Component({
  selector: 'app-rp',
  template: `
    <p>
      rp works! {{ rp$ | async }}
    </p>
  `,
  styles: []
})
export class RpComponent implements OnInit {

  rp$: Observable<string>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: RpService
  ) { }

  ngOnInit() {
    this.rp$ = this.route.paramMap.switchMap((params:ParamMap) => this.service.getRp(params.get('rpCode')))
  }

}
