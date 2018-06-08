import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../app.constants';
import * as coolstory from 'coolstory.js';
import { Observable, Subscription } from 'rxjs';
import { Title } from '@angular/platform-browser';
import { TrackService } from '../track.service';

@Component({
  template: `
    <section style="display: flex; flex-direction: column; align-items: center; height:100%; width:90vw; max-width:400px; margin: auto">

      <span style="height:10vh"></span>

      <header title="Let's RPNow">
        <aside class="mat-display-1" style="max-width:150px;transform:rotate(-10deg); margin-bottom:0">Let's</aside>
        <h1 class="mat-display-3" style="margin:0;text-align:center">RPNow</h1>
      </header>

      <span style="height:10vh"></span>

      <div *ngIf="!submitted" style="display: flex; flex-direction: column">

        <mat-form-field>

          <input matInput [(ngModel)]="title" maxlength="30" placeholder="Name your story"
            (focus)="track.event('Title','focus')"
            (change)="track.event('Title','change')"
            >
          <button matSuffix mat-icon-button (click)="spinTitle(); track.event('Title', 'spin')">
            <mat-icon matTooltip="Random title!">casino</mat-icon>
          </button>

        </mat-form-field>

        <mat-form-field *ngIf="showMoreOptions">

          <textarea matInput [(ngModel)]="desc" maxlength="255" matTextareaAutosize placeholder="Enter a description..."
            (focus)="track.event('Desc','focus')"
            (change)="track.event('Desc','change')"
            >
          </textarea>

        </mat-form-field>

        <mat-checkbox [(ngModel)]="agreedToTerms">
          I agree to RPNow's <a href="/terms" target="_blank">terms of use.</a>
        </mat-checkbox>

        <span style="height:5vh"></span>

        <div style="display:flex; flex-direction:row; justify-content:space-around">

          <button mat-raised-button color="primary" (click)="createRp(); track.event('Room', 'create')" [disabled]="!title || !agreedToTerms">
            <mat-icon>check</mat-icon>
            Create RP
          </button>

          <button *ngIf="!showMoreOptions" mat-raised-button (click)="showMoreOptions=true; track.event('Desc', 'reveal')">
            <mat-icon>more_horiz</mat-icon>
            Options
          </button>

        </div>

      </div>

      <div *ngIf="submitted">
        <mat-spinner [diameter]="96"></mat-spinner>
      </div>

    </section>
  `,
  changeDetection: ChangeDetectionStrategy.Default
})
export class TitleComponent implements OnInit {

  public title = '';
  public desc = '';

  public showMoreOptions = false;
  public agreedToTerms = false;
  public submitted = false;

  private spinnerSub: Subscription;

  constructor(
    private http: HttpClient,
    private router: Router,
    private titleService: Title,
    public track: TrackService
  ) { }

  ngOnInit() {
    this.titleService.setTitle('RPNow: No-Registration Roleplay Chat Service');
  }

  public async createRp() {
    this.submitted = true;
    const data: any = await this.http.post(API_URL + '/api/rp.json', {title: this.title, desc: this.desc}).toPromise();
    const rpCode = data.rpCode;
    this.router.navigate(['/rp/' + rpCode]);
  }

  public spinTitle() {
    if (this.spinnerSub) this.spinnerSub.unsubscribe();
    this.spinnerSub = this.spinner().subscribe(() => this.title = coolstory.title(20));
  }

  private spinner(): Observable<void> {
    return Observable.create(obs => {
      let millis = 10.0;
      while ((millis *= 1.15) < 200.0 / .15) {
        setTimeout(() => obs.next(), millis);
      }
      setTimeout(() => { obs.next(); obs.complete(); }, millis);
    });
  }
}
