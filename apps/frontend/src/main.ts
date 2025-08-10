import {bootstrapApplication} from '@angular/platform-browser';
import {RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules} from '@angular/router';
import {IonicRouteStrategy, ModalController, provideIonicAngular} from '@ionic/angular/standalone';
import {HTTP_INTERCEPTORS, withInterceptors} from '@angular/common/http'; // Import HTTP_INTERCEPTORS
import {routes} from './app/app.routes';
import {AppComponent} from './app/app.component';
import {provideHttpClient} from "@angular/common/http";
import {authInterceptor} from "./app/services/auth/auth.interceptor";
import {provideAnimations} from '@angular/platform-browser/animations';
import {isDevMode} from '@angular/core';
import {provideServiceWorker} from '@angular/service-worker';


// Log whether we're in development mode
console.log('Development mode:', isDevMode());
bootstrapApplication(AppComponent, {
  providers: [
    {provide: RouteReuseStrategy, useClass: IonicRouteStrategy},
    provideIonicAngular({
      useSetInputAPI: true, //  required for input signals on controller based modals.
    }),
    provideHttpClient(
      withInterceptors([authInterceptor]),
    ),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideAnimations(),
    // provideServiceWorker('ngsw-worker.js', {
    //   enabled: !isDevMode(),
    //   registrationStrategy: 'registerWhenStable:30000'
    // }),
    provideServiceWorker('custom-service-worker.js', { enabled: true })

  ],
});
