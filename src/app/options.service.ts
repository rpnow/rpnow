import { Injectable } from '@angular/core';

export interface Options {
	rpnow: {
		rooms: {
			[key: string]: {
				msgBoxContent: string,
				msgBoxVoice: string,
				recentCharas: number[]
			}
		},
		global: {
			lastColor: string,
			challenge: {
				hash: string,
				secret: string
			},
			downloadOOC: boolean,
			nightMode: boolean,
			notificationNoise: number,
			pressEnterToSend: boolean,
			showMessageDetails: boolean
		}
	}
}

@Injectable()
export class OptionsService {

	private store: object;
	private proxyHandler: ProxyHandler<Options>;
	public options: Options;

	constructor() {

		this.store = {};

		let s = this.store;

		let proxyHandler = {
			get(obj, propName) {
				// if not yet defined, add a new object here
				if (!(propName in obj)) {
					obj[propName] = {};
					return new Proxy(obj[propName], proxyHandler);
				}
				// if it is defined and is an object, return a proxy for it
				else if (typeof obj[propName] === 'object') {
					return new Proxy(obj[propName], proxyHandler);
				}
				// for non-object types, return the value
				else {
					return obj[propName];
				}
			},
			set(obj, propName, value) {
				value = JSON.parse(JSON.stringify(value));
				if (typeof value === 'object') {
					obj[propName] = {};
					let innerProxy = new Proxy(obj[propName], proxyHandler);
					for (let valueProp in value) {
						innerProxy[valueProp] = value[valueProp];
					}
				}
				else {
					obj[propName] = value;
				}
				return true;
			}
		}

		// 
		this.proxyHandler = proxyHandler;

		this.options = <Options>new Proxy(this.store, this.proxyHandler);

	}

}
