import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { RpService } from '../rp.service';

@Component({
  selector: 'app-rp',
  template: `
    <h1>RP Title: {{ rp.title$ | async }}</h1>
    <h2>Description: {{ rp.desc$ | async }}</h2>
    <pre>{{ rp.charas$ | async | json }}</pre>
    <hr />
    <pre>{{ rp.messages$ | async | json }}</pre>
  `,
  styles: []
})
export class RpComponent implements OnInit {

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rp: RpService
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe((params:ParamMap) => {
      let rpCode = params.get('rpCode');
      this.rp.join(rpCode);
    })
  }

}
