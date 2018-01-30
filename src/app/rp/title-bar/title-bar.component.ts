import { Component, OnInit, Input } from '@angular/core';
import { MainMenuService } from '../../main-menu.service';
import { MatDialog } from '@angular/material/dialog';
import { DownloadDialogComponent } from '../download-dialog/download-dialog.component';
import { Rp } from '../../rp.service';

@Component({
  selector: 'title-bar',
  templateUrl: 'title-bar.html',
  styles: []
})
export class TitleBarComponent implements OnInit {

  @Input() rp: Rp;

  constructor(
    private mainMenuService: MainMenuService,
    private dialog: MatDialog
  ) { }

  ngOnInit() {
  }

  public openMenu() {
    this.mainMenuService.menu.open();
  }

  public openDownloadDialog() {
    let dialogRef = this.dialog.open(DownloadDialogComponent, { data: { rp: this.rp } });
  }

}
