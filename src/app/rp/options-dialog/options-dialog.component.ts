import { Component, OnInit } from '@angular/core';
import { OptionsService } from '../options.service';
import { noises } from '../notify.service';

@Component({
  selector: 'app-options-dialog',
  templateUrl: 'options-dialog.html',
  styles: []
})
export class OptionsDialogComponent implements OnInit {

  public readonly noteNoiseOptions = noises;

  constructor(
    public options: OptionsService
  ) { }

  ngOnInit() {
  }

}
