import { Injectable } from '@angular/core';
import { Challenge } from './challenge.service';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

// export interface RoomsOptions {
// 	[key: string]: {
// 		msgBoxContent: string,
// 		msgBoxVoice: string,
// 		recentCharas: Readonly<number[]>
// 	}
// }


function subject<T>(propName: string, defaultValue: T): BehaviorSubject<T> {
	let localStorageKey = 'rpnow.global.'+propName;
	let stringValue = localStorage.getItem(localStorageKey);
	let value = (stringValue != null) ? JSON.parse(stringValue) : defaultValue;

	let subj = new BehaviorSubject(value);

	subj.subscribe(value => localStorage.setItem(localStorageKey, JSON.stringify(value)));

	return subj;
}

@Injectable()
export class OptionsService {

	public readonly lastColor$: BehaviorSubject<string> = subject('lastColor', '#80c9ff');
	public get lastColor() { return this.lastColor$.value; }
	public set lastColor(value) { this.lastColor$.next(value); }

	public readonly challenge$: BehaviorSubject<Readonly<Challenge>> = subject('challenge', null);
	public get challenge() { return this.challenge$.value; }
	public set challenge(value) { this.challenge$.next(value); }

	public readonly downloadOOC$: BehaviorSubject<boolean> = subject('downloadOOC', true);
	public get downloadOOC() { return this.downloadOOC$.value; }
	public set downloadOOC(value) { this.downloadOOC$.next(value); }

	public readonly nightMode$: BehaviorSubject<boolean> = subject('nightMode', false);
	public get nightMode() { return this.nightMode$.value; }
	public set nightMode(value) { this.nightMode$.next(value); }

	public readonly notificationNoise$: BehaviorSubject<number> = subject('notificationNoise', 1);
	public get notificationNoise() { return this.notificationNoise$.value; }
	public set notificationNoise(value) { this.notificationNoise$.next(value); }

	public readonly pressEnterToSend$: BehaviorSubject<boolean> = subject('pressEnterToSend', true);
	public get pressEnterToSend() { return this.pressEnterToSend$.value; }
	public set pressEnterToSend(value) { this.pressEnterToSend$.next(value); }

	public readonly showMessageDetails$: BehaviorSubject<boolean> = subject('showMessageDetails', true);
	public get showMessageDetails() { return this.showMessageDetails$.value; }
	public set showMessageDetails(value) { this.showMessageDetails$.next(value); }

}
