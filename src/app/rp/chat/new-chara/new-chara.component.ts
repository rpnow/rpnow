import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { OptionsService } from '../../options.service';
import { RpService } from '../../rp.service';

@Component({
  selector: 'app-new-chara',
  templateUrl: 'new-chara.html',
  styles: []
})
export class NewCharaComponent implements OnInit {

  loading: boolean = false;

  name: string = '';
  color: string = '#556677';

  constructor(
    public rp: RpService,
    private dialogRef: MatDialogRef<NewCharaComponent>,
    private options: OptionsService
  ) { }

  ngOnInit() {
    this.color = this.options.lastColor;
  }

  valid() {
    return this.name.trim() && this.color;
  }

  async submit() {
    if (!this.valid()) return;

    this.loading = true;

    this.options.lastColor = this.color;

    let chara = await this.rp.addChara({ name: this.name, color: this.color });
    this.dialogRef.close(chara);
  }

  cancel() {
    this.dialogRef.close(null);
  }

}
