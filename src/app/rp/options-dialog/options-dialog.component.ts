import { Component, OnInit } from '@angular/core';
import { OptionsService } from '../options.service';

@Component({
  selector: 'app-options-dialog',
  templateUrl: 'options-dialog.html',
  styles: []
})
export class OptionsDialogComponent implements OnInit {

  constructor(
    public options: OptionsService
  ) { }

  ngOnInit() {
  }

}
