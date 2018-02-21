import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Rp } from '../../rp.service';
import { OptionsService } from '../../options.service';

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
    private dialogRef: MatDialogRef<NewCharaComponent>,
    @Inject(MAT_DIALOG_DATA) private data: { rp: Rp },
    private options: OptionsService
  ) { }

  ngOnInit() {
    this.color = this.options.lastColor;
  }

  async submit() {
    this.loading = true;

    this.options.lastColor = this.color;

    let chara = await this.data.rp.addChara({ name: this.name, color: this.color });
    this.dialogRef.close(chara);
  }

  cancel() {
    this.dialogRef.close(null);
  }

}
