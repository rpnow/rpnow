import { Injectable } from '@angular/core';
import { Challenge } from './challenge.service';

// export interface RoomsOptions {
// 	[key: string]: {
// 		msgBoxContent: string,
// 		msgBoxVoice: string,
// 		recentCharas: Readonly<number[]>
// 	}
// }

// export interface GlobalOptions {
// 	lastColor: string,
// 	challenge: Readonly<{ hash: string, secret: string }>,
// 	downloadOOC: boolean,
// 	nightMode: boolean,
// 	notificationNoise: number,
// 	pressEnterToSend: boolean,
// 	showMessageDetails: boolean
// }


@Injectable()
export class OptionsService {
	private cache: any = {};

	private get(propName: string) {
		if (!(propName in this.cache)) {
			let value = localStorage.getItem('rpnow.global.'+propName);
			this.cache[propName] = value && JSON.parse(value);
		} 
		return this.cache[propName];
	}

	private set(propName: string, value: any) {
		this.cache[propName] = JSON.parse(JSON.stringify(value));
		localStorage.setItem('rpnow.global.'+propName, JSON.stringify(value));
	}

	public get lastColor(): string { return this.get('lastColor') }
	public set lastColor(value: string) { this.set('lastColor', value) }

	public get challenge(): Readonly<Challenge> { return this.get('challenge') }
	public set challenge(value: Readonly<Challenge>) { this.set('challenge', value) }

	public get downloadOOC(): boolean { return this.get('downloadOOC') }
	public set downloadOOC(value: boolean) { this.set('downloadOOC', value) }
}
