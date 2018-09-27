import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { RpConnectionState } from '../services/rp.service';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'rpn-connection-indicator',
  template: `
    <div class="connection-indicator" [style]="style()">
      <mat-icon>{{ icon() }}</mat-icon>
      {{ text() }}
    </div>
  `,
  styles: [`
    .connection-indicator {
      padding: 10px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .connection-indicator mat-icon {
      margin-right: 5px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConnectionIndicatorComponent {

  constructor(private sanitizer: DomSanitizer) {}

  @Input() connection: RpConnectionState;

  style() {
    if (this.connection === 'connected') {
      return this.sanitizer.bypassSecurityTrustStyle('display: none');
    } else {
      let color;
      if (this.connection === 'offline') color = 'red';
      if (this.connection === 'reconnecting') color = 'orange';
      if (this.connection === 'reloading') color = 'orange';
      return this.sanitizer.bypassSecurityTrustStyle(`background-color: ${color}; color: white`);
    }
  }

  icon() {
    if (this.connection === 'reconnecting') return 'loop';
    if (this.connection === 'reloading') return 'loop';
    return 'error';
  }

  text() {
    if (this.connection === 'offline') return 'Connection lost. Retrying in 3 seconds.'
    if (this.connection === 'reconnecting') return 'Attempting to reconnect...'
    if (this.connection === 'reloading') return 'Synchronizing...'
    return this.connection;
  }

}
