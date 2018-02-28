import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { RpService } from '../../rp.service';

@Component({
  selector: 'app-image-dialog',
  templateUrl: 'image-dialog.html',
  styles: []
})
export class ImageDialogComponent {

  loading: boolean = false;

  url: string = '';

  constructor(
    public rp: RpService,
    private dialogRef: MatDialogRef<ImageDialogComponent>
  ) { }

  ngOnInit() {
  }

  async submit() {
    this.loading = true;
    await this.rp.addImage(this.url);
    this.dialogRef.close();
  }

  cancel() {
    this.dialogRef.close();
  }

}

