import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Rp } from '../../../rp.service';

@Component({
  selector: 'app-new-chara',
  templateUrl: 'new-chara.html',
  styles: []
})
export class NewCharaComponent implements OnInit {

  loading: boolean = false;

  constructor(
    private dialogRef: MatDialogRef<NewCharaComponent>,
    @Inject(MAT_DIALOG_DATA) private data: { rp: Rp }
  ) { }

  ngOnInit() {
  }

  async submit() {
    this.loading = true;

    let chara = await this.data.rp.addChara({ name: 'max', color: '#556677' });
    this.dialogRef.close(chara);
  }

  cancel() {
    this.dialogRef.close(null);
  }

}
