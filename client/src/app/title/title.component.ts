import { Component, OnInit, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Title, Meta } from '@angular/platform-browser';
import { TrackService } from '../track.service';

@Component({
  selector: 'rpn-title',
  template: `
    <rpn-lets-rpnow></rpn-lets-rpnow>

    <p id="subheader">
      Free,&nbsp;private, no-registration
      roleplay&nbsp;chatrooms.
    </p>

    <ng-container *ngIf="!submitted">
      <rpn-title-entry
        (chooseTitle)="createRp($event)"
        (trackableEvent)="track.event('Title', $event)"
      ></rpn-title-entry>

      <p id="new-users">
        New user?
        <a routerLink="/rp/demo">Try our demo!</a>
      </p>
    </ng-container>

    <mat-spinner *ngIf="submitted" [diameter]="96"></mat-spinner>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 0 5%;
      box-sizing: border-box;
    }
    p {
      margin: 0;
      text-align: center;
      line-height: 1.5;
    }
    rpn-lets-rpnow {
      padding: 10vh 0 1.7vh;
    }
    #subheader {
      font-size: 16px;
      opacity: 0.7;
      font-style: italic;
    }
    @media (min-width: 650px) {
      #subheader {
        font-size: 20px;
      }
    }
    rpn-title-entry {
      margin: 7vh 0 9vh;
    }
    #new-users {
      font-size: 18px;
    }
    @media (min-width: 650px) {
      #new-users {
        font-size: 24px;
      }
    }
    #new-users a {
      font-weight: bold;
      text-decoration: none;
      border-bottom: 1px dotted rgb(124, 77, 255);
      color: rgb(124, 77, 255);
    }
    mat-spinner {
      margin-top: 7vh;
    }
  `],
  changeDetection: ChangeDetectionStrategy.Default
})
export class TitleComponent implements OnInit, OnDestroy {
  submitted = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private titleService: Title,
    private metaService: Meta,
    public track: TrackService
  ) { }

  ngOnInit() {
    this.titleService.setTitle('RPNow: No-Registration Roleplay Chat Service');
    this.metaService.addTag({ name: 'description', content:
      'Instantly create free, private roleplay chatrooms. No registration required, ever!'
    });
  }

  ngOnDestroy() {
    this.metaService.removeTag('name="description"');
  }

  async createRp(title: string) {
    this.submitted = true;
    const data = { title };
    const res: any = await this.http.post(environment.apiUrl + '/api/rp.json', data).toPromise();
    const rpCode: string = res.rpCode;
    this.router.navigate(['/rp/' + rpCode]);
  }
}
