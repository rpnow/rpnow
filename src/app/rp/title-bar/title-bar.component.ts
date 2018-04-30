import { Component, OnInit, Input, ViewContainerRef, ChangeDetectionStrategy } from '@angular/core';
import { MainMenuService } from '../main-menu.service';
import { MatDialog } from '@angular/material/dialog';
import { DownloadDialogComponent } from '../download-dialog/download-dialog.component';
import { RpService } from '../rp.service';

@Component({
  selector: 'title-bar',
  templateUrl: 'title-bar.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TitleBarComponent implements OnInit {

  constructor(
    public rp: RpService,
    private mainMenuService: MainMenuService
  ) { }

  ngOnInit() {
  }

  public openMenu() {
    this.mainMenuService.menu.open();
  }

}
