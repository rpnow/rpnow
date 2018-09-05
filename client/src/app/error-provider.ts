import { ErrorHandler } from '@angular/core';
import * as Raven from 'raven-js';
import { environment } from '../environments/environment';

if (environment.production) {
  Raven
    .config('https://52c82e2f9c8c423cbbf591098a9b87f3@sentry.io/1274661', {
      release: '0e4fdef81448dcfa0e16ecc4433ff3997aa53572'
    })
    .install();
}

export class RavenErrorHandler implements ErrorHandler {
  handleError(err: any) {
    Raven.captureException(err);
  }
}

export const sentryProvider = {
  provide: ErrorHandler,
  useClass: RavenErrorHandler
}

export const sentryProviderArray = (environment.production) ? [sentryProvider] : [];

