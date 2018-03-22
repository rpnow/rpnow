import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../app.constants';
import * as coolstory from 'coolstory.js';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { Title } from '@angular/platform-browser';
import { TrackService } from '../track.service';

@Component({
  templateUrl: 'title.template.html',
  styles: []
})
export class TitleComponent implements OnInit {

  public title = '';
  public desc = '';

  public showMoreOptions: boolean = false;
  public submitted: boolean = false;

  private spinnerSub: Subscription;

  constructor(
    private http: HttpClient,
    private router: Router,
    private titleService: Title,
    public track: TrackService
  ) { }

  ngOnInit() {
    this.titleService.setTitle('RPNow: No-Registration Roleplay Chat Service')
  }

  public async createRp() {
    this.submitted = true;
    let data:any = await this.http.post(API_URL + '/api/rp.json', {title: this.title, desc: this.desc}).toPromise();
    let rpCode = data.rpCode;
    this.router.navigate(['/rp/' + rpCode]);
  }

  public spinTitle() {
    if (this.spinnerSub) this.spinnerSub.unsubscribe();
    this.spinnerSub = this.spinner().subscribe(() => this.title = coolstory.title(20));
  }

  private spinner(): Observable<void> {
    return Observable.create(obs => {
      let millis = 10.0;
      while ((millis *=1.15) < 200.0/.15) {
        setTimeout(() => obs.next(), millis);
      }
      setTimeout(() => { obs.next(); obs.complete() }, millis);
    })
  }
}
