import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { TokenService } from './token.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const token = tokenService.getAccessToken();

  if (token && !req.url.includes('/auth/refresh')) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    // Attach impersonation header if SuperAdmin is impersonating a Tenant
    const impersonatedTenantId = localStorage.getItem('impersonated_tenant_id');
    if (impersonatedTenantId) {
      headers['X-Impersonate-Tenant-Id'] = impersonatedTenantId;
    }

    req = req.clone({ setHeaders: headers });
  }

  return next(req);
};
