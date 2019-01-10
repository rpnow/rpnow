// import { Injectable, OnDestroy } from '@angular/core';
// import { SwUpdate } from '@angular/service-worker';
// import { interval, Subscription } from 'rxjs';
// import { environment } from 'src/environments/environment';

// @Injectable()
// export class ClientUpdateService implements OnDestroy {
//     private sub: Subscription;

//     constructor(updates: SwUpdate) {
//         if (!environment.production) return;

//         this.sub = interval(15 * 60 * 1000).subscribe(() => updates.checkForUpdate());
//     }

//     ngOnDestroy() {
//         if (!environment.production) return;

//         this.sub.unsubscribe();
//     }
// }
