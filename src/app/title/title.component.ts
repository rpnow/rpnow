import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../app.constants';

@Component({
  selector: 'app-title',
  template: `
    Title: <input type="text" [(ngModel)]="title" /> <br/>
    Description: <input type="text" [(ngModel)]="desc" /> <br/>
    <button (click)="createRp()">RP Now! {{title}}</button>
  `,
  styles: []
})
export class TitleComponent implements OnInit {

  public title: string;
  public desc: string;

  constructor(
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit() {
  }

  public async createRp() {
    let data:any = await this.http.post(API_URL + '/api/rp.json', {title: this.title, desc: this.desc}).toPromise();
    let rpCode = data.rpCode;
    this.router.navigate(['/rp/' + rpCode]);
  }
}
