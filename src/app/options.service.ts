import { Injectable } from '@angular/core';

// export interface RoomsOptions {
// 	[key: string]: {
// 		msgBoxContent: string,
// 		msgBoxVoice: string,
// 		recentCharas: Readonly<number[]>
// 	}
// }

export interface GlobalOptions {
	lastColor: string,
	challenge: Readonly<{ hash: string, secret: string }>,
	downloadOOC: boolean,
	nightMode: boolean,
	notificationNoise: number,
	pressEnterToSend: boolean,
	showMessageDetails: boolean
}

@Injectable()
export class OptionsService {

	public readonly global: GlobalOptions = <GlobalOptions> new Proxy({}, {
		get(obj: any, propName: PropertyKey) {
			let value = localStorage.getItem('rpnow.global.'+propName.toString());
			return value && JSON.parse(value);
		},
		set(obj: any, propName: PropertyKey, value: any) {
			localStorage.setItem('rpnow.global.'+propName.toString(), JSON.stringify(value));
			return true;
		}
	})

}
