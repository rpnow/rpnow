import { Component, ChangeDetectionStrategy, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import * as coolstory from 'coolstory.js';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'rpn-title-entry',
  template: `
    <!-- The empty (input) event is so angular hears every input change, to update the button state -->
    <input #input type="text"
      (input)="0"
      maxlength="30"
      placeholder="Name your story"
      (focus)="trackableEvent.emit('focus')"
      (change)="trackableEvent.emit('change')"
      >
    <button id="random-button" (click)="spinTitle(); trackableEvent.emit('spin')" matTooltip="Random title!">
      <mat-icon>casino</mat-icon>
    </button>
    <button id="go-button" (click)="clickGoButton(); trackableEvent.emit('create')" [disabled]="!input.value">
      <mat-icon>arrow_forward</mat-icon>
    </button>
  `,
  styles: [`
    :host {
      box-shadow: 0 0.5px 1.5px rgba(0,0,0,0.5);
      border-radius: 2px;
      margin-bottom: 10vh;
      display:flex;
      flex-direction:row;
      align-items: center;
      overflow: hidden;
      width: 100%;
      max-width: 400px;
    }
    input {
      background: none;
      outline: none;
      border: none;
      padding: 15px 0 15px 10px;
      width: 100%;
      font-family: Alice;
      font-size: 16px;
    }
    #random-button {
      background: none;
      outline: none;
      border: none;
      cursor: pointer;
      opacity: 0.2;
      padding-left: 5px;
      padding-right: 10px;
    }
    #go-button {
      align-self: stretch;
      border: none;
      outline: none;
      border-radius: 0;
      box-shadow: none;
      padding: 0;
      width: 15vh;
      max-width: 80px;
      transition: 0.2s;
    }
    #go-button:not([disabled]) {
      cursor: pointer;
      background-color: #7c4dff;
      color: white;
    }
    button {
      padding: 0;
    }
    button mat-icon {
      padding: 15px 0;
    }
    @media (min-width: 650px) {
      :host {
        max-width: 500px;
      }
      input {
        font-size: 24px;
      }
      #go-button {
        max-width: 120px;
      }
      button mat-icon {
        font-size: 32px;
        height: 32px;
        width: 32px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.Default
})
export class TitleEntryComponent {

  @ViewChild('input') input: ElementRef<HTMLInputElement>;

  @Output() readonly chooseTitle = new EventEmitter<string>();
  @Output() readonly trackableEvent = new EventEmitter<string>();

  private spinnerSub: Subscription;

  spinTitle() {
    if (this.spinnerSub) this.spinnerSub.unsubscribe();
    this.spinnerSub = this.spinner().subscribe(() => this.input.nativeElement.value = coolstory.title(20));
  }

  private spinner(): Observable<void> {
    return Observable.create(obs => {
      let millis = 10.0;
      while ((millis *= 1.15) < 200.0 / .15) {
        setTimeout(() => obs.next(), millis);
      }
      setTimeout(() => { obs.next(); obs.complete(); }, millis);
    });
  }

  clickGoButton() {
    this.chooseTitle.emit(this.input.nativeElement.value);
  }

}
