import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RpService } from '../rp.service';

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

  constructor(private service: RpService, private router: Router) { }

  ngOnInit() {
  }

  public async createRp() {
    let rpCode = await this.service.create(this.title, this.desc);
    this.router.navigate(['/rp/' + rpCode]);
  }
}
