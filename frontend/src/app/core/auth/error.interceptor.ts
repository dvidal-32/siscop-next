import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { TokenService } from './token.service';
import { AuthService } from './auth.service';
import { catchError, switchMap, throwError, from } from 'rxjs';
import { Router } from '@angular/router';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: any) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        if (
          req.url.includes('/auth/login') ||
          req.url.includes('/auth/refresh') ||
          req.url.includes('/auth/register-tenant')
        ) {
          // If auth endpoint itself fails, propagate error
          return throwError(() => error);
        }

        return from(authService.refreshToken()).pipe(
          switchMap((res: any) => {
            const newRequest = req.clone({
              setHeaders: {
                Authorization: `Bearer ${res.accessToken}`,
              },
            });
            return next(newRequest);
          }),
          catchError((refreshError) => {
            authService.logout();
            router.navigate(['/login']);
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
