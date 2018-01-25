import { Component, OnInit, Input } from '@angular/core';
import { MainMenuService } from '../../main-menu.service';

@Component({
  selector: 'title-bar',
  templateUrl: 'title-bar.html',
  styles: []
})
export class TitleBarComponent implements OnInit {

  @Input() title: string;
  @Input() desc: string;
  @Input() rpCode: string;

  constructor(private mainMenuService: MainMenuService) { }

  ngOnInit() {
  }

  public openMenu() {
    this.mainMenuService.menu.open();
  }

}
