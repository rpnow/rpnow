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

	private readonly proxyHandler: ProxyHandler<any> = {
		get(obj: any, propName: PropertyKey) {
			if (!(propName in obj)) {
				let value = localStorage.getItem('rpnow.global.'+propName.toString());
				obj[propName] = value && JSON.parse(value);
			} 
			return obj[propName];
		},
		set(obj: any, propName: PropertyKey, value: any) {
			obj[propName] = JSON.parse(JSON.stringify(value));
			localStorage.setItem('rpnow.global.'+propName.toString(), JSON.stringify(value));
			return true;
		}
	}

	public readonly global: GlobalOptions = <GlobalOptions> new Proxy({}, this.proxyHandler)

}
