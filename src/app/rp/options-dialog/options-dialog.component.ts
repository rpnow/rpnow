import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { OptionsService } from '../options.service';
import { noises } from '../notify.service';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-options-dialog',
  templateUrl: 'options-dialog.html',
  styles: [`
    mat-select { max-width: 200px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OptionsDialogComponent implements OnInit {

  public readonly noteNoiseOptions = noises;

  constructor(
    private dialogRef: MatDialogRef<OptionsDialogComponent>,
    public options: OptionsService
  ) { }

  ngOnInit() {
  }

  close() {
    this.dialogRef.close();
  }

}
