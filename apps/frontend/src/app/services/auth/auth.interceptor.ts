import { Injectable } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse
} from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { ModalController } from '@ionic/angular';
import { from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import {LoginModalComponent} from "../../components/login-modal/login-modal.component";
import {AuthUiService} from "./auth-ui-service";

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const authUiService = inject(AuthUiService);

  const token = authService.getToken();
  const cloned = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(cloned).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        return from(authUiService.openLoginModal()).pipe(
          switchMap(success => {
            if (success) {
              const newToken = authService.getToken();
              const retry = req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } });
              return next(retry);
            }
            return throwError(() => err);
          })
        );
      }
      return throwError(() => err);
    })
  );
};

