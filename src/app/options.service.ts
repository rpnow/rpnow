import { Injectable } from '@angular/core';
import { Challenge } from './challenge.service';

// export interface RoomsOptions {
// 	[key: string]: {
// 		msgBoxContent: string,
// 		msgBoxVoice: string,
// 		recentCharas: Readonly<number[]>
// 	}
// }

@Injectable()
export class OptionsService {

	/*
	 * Functions to manipulate and access localstorage
	 */
	private cache: any = {};

	private get(propName: string, defaultValue: any) {
		if (!(propName in this.cache)) {
			let value = localStorage.getItem('rpnow.global.'+propName);
			this.cache[propName] = (value != null) ? JSON.parse(value) : defaultValue;
		} 
		return this.cache[propName];
	}

	private set(propName: string, value: any) {
		this.cache[propName] = JSON.parse(JSON.stringify(value));
		localStorage.setItem('rpnow.global.'+propName, JSON.stringify(value));
	}

	/*
	 * Global options definitions
	 */
	public get lastColor(): string {
		return this.get('lastColor', '#80c9ff')
	}
	public set lastColor(value: string) {
		this.set('lastColor', value)
	}

	public get challenge(): Readonly<Challenge> {
		return this.get('challenge', null)
	}
	public set challenge(value: Readonly<Challenge>) {
		this.set('challenge', value)
	}

	public get downloadOOC(): boolean {
		return this.get('downloadOOC', true)
	}
	public set downloadOOC(value: boolean) {
		this.set('downloadOOC', value)
	}

	public get nightMode(): boolean {
		return this.get('nightMode', false)
	}
	public set nightMode(value: boolean) {
		this.set('nightMode', value)
	}

	public get notificationNoise(): number {
		return this.get('notificationNoise', 1)
	}
	public set notificationNoise(value: number) {
		this.set('notificationNoise', value)
	}

	public get pressEnterToSend(): boolean {
		return this.get('pressEnterToSend', true)
	}
	public set pressEnterToSend(value: boolean) {
		this.set('pressEnterToSend', value)
	}

	public get showMessageDetails(): boolean {
		return this.get('showMessageDetails', true)
	}
	public set showMessageDetails(value: boolean) {
		this.set('showMessageDetails', value)
	}

}
