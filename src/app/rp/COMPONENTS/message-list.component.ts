import { Component, OnInit, ChangeDetectionStrategy, Input } from '@angular/core';
import { RpMessage, RpChara } from '../rp.service';

@Component({
  selector: 'rp-message-list',
  template: `
    <div style="padding: 10px 10px 20px">
      <rp-message *ngFor="let msg of messages; trackBy: trackById" [msg]="msg"></rp-message>
    </div>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageListComponent implements OnInit {

  @Input() messages: RpMessage[]
  // @Input() charas: RpChara[]
  // @Input() challenge: string
  // @Input() showMessageDetails: boolean
  // @Input() pressEnterToSend: boolean

  ngOnInit() {
  }

  trackById(index: number, item: RpMessage) {
    return item._id;
  }

}
