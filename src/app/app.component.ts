import { Component, OnInit, ViewChild } from '@angular/core';
import { MainMenuService } from './main-menu.service';
import { MatSidenav } from '@angular/material/sidenav';

@Component({
  selector: 'app-root',
  templateUrl: 'app.html',
  styles: [],
  providers: [MainMenuService]
})
export class AppComponent implements OnInit {
  @ViewChild('mainMenu') mainMenu: MatSidenav;

  constructor(private mainMenuService: MainMenuService) { }

  ngOnInit() {
    this.mainMenuService.setInstance(this.mainMenu);
  }
}
