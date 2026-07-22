import { Routes } from '@angular/router';
// Routes definition for Siscop Next
import { LoginComponent } from './features/auth/login/login';
import { RegisterTenantComponent } from './features/auth/register-tenant/register-tenant';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password';
import { DashboardComponent } from './features/dashboard/dashboard';
import { MainLayoutComponent } from './layout/main-layout/main-layout';
import { CompanyComponent } from './features/admin/company/company';
import { UsersComponent } from './features/admin/users/users';
import { RolesComponent } from './features/admin/roles/roles';
import { AuditComponent } from './features/admin/audit/audit';
import { BillingComponent } from './features/admin/billing/billing';
import { LinesColorsComponent } from './features/admin/lines-colors/lines-colors';
import { CatalogItemsComponent } from './features/admin/catalog/catalog';
import { PlansMgmtComponent } from './features/admin/plans-mgmt/plans-mgmt';
import { PlatformSettingsComponent } from './features/admin/platform-settings/platform-settings';
import { TenantsMgmtComponent } from './features/admin/tenants-mgmt/tenants-mgmt';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { permissionGuard } from './core/guards/permission.guard';

import { VerifyEmailComponent } from './features/auth/verify-email/verify-email';
import { TemplatesComponent } from './features/engineering/templates/templates';
import { FormulasComponent } from './features/engineering/formulas/formulas';
import { SimulatorComponent } from './features/engineering/simulator/simulator';
import { LibraryComponent } from './features/engineering/library/library';

import { ClientsComponent } from './features/commercial/clients/clients';
import { ProjectsComponent } from './features/commercial/projects/projects';
import { QuotesComponent } from './features/commercial/quotes/quotes';
import { PriceListComponent } from './features/commercial/price-list/price-list';
import { TemplatePricingComponent } from './features/commercial/template-pricing/template-pricing';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [guestGuard],
  },
  {
    path: 'verify-email',
    component: VerifyEmailComponent,
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    component: RegisterTenantComponent,
    canActivate: [guestGuard],
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
    canActivate: [guestGuard],
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent,
    canActivate: [guestGuard],
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        component: DashboardComponent,
      },
      {
        path: 'admin/company',
        component: CompanyComponent,
        canActivate: [permissionGuard],
        data: { permission: 'settings.view' },
      },
      {
        path: 'admin/users',
        component: UsersComponent,
        canActivate: [permissionGuard],
        data: { permission: 'users.view' },
      },
      {
        path: 'admin/roles',
        component: RolesComponent,
        canActivate: [permissionGuard],
        data: { permission: 'roles.view' },
      },
      {
        path: 'audit-logs',
        component: AuditComponent,
        canActivate: [permissionGuard],
        data: { permission: 'audit.view' },
      },
      {
        path: 'admin/billing',
        component: BillingComponent,
        canActivate: [permissionGuard],
        data: { permission: 'billing.view' },
      },
      {
        path: 'admin/lines-colors',
        component: LinesColorsComponent,
        canActivate: [permissionGuard],
        data: { permission: 'settings.view' },
      },
      {
        path: 'admin/catalog',
        component: CatalogItemsComponent,
        canActivate: [permissionGuard],
        data: { permission: 'settings.view' },
      },
      {
        path: 'admin/plans-mgmt',
        component: PlansMgmtComponent,
        canActivate: [permissionGuard],
        data: { permission: 'plans.view' },
      },
      {
        path: 'admin/platform-settings',
        component: PlatformSettingsComponent,
        canActivate: [permissionGuard],
        data: { permission: 'platform-settings.view' },
      },
      {
        path: 'admin/tenants',
        component: TenantsMgmtComponent,
        canActivate: [permissionGuard],
        data: { permission: 'tenants.view' },
      },
      // Rutas del Módulo de Ingeniería
      {
        path: 'engineering/templates',
        component: TemplatesComponent,
        canActivate: [permissionGuard],
        data: { permission: 'engineering.view' },
      },
      {
        path: 'engineering/formulas',
        component: FormulasComponent,
        canActivate: [permissionGuard],
        data: { permission: 'engineering.view' },
      },
      {
        path: 'engineering/simulator',
        component: SimulatorComponent,
        canActivate: [permissionGuard],
        data: { permission: 'engineering.simulate' },
      },
      {
        path: 'engineering/library',
        component: LibraryComponent,
        canActivate: [permissionGuard],
        data: { permission: 'engineering.import' },
      },
      // Rutas del Módulo Comercial
      {
        path: 'commercial/price-list',
        component: PriceListComponent,
        canActivate: [permissionGuard],
        data: { permission: 'settings.view' },
      },
      {
        path: 'commercial/clients',
        component: ClientsComponent,
        canActivate: [permissionGuard],
        data: { permission: 'clients.view' },
      },
      {
        path: 'commercial/projects',
        component: ProjectsComponent,
        canActivate: [permissionGuard],
        data: { permission: 'projects.view' },
      },
      {
        path: 'commercial/quotes',
        component: QuotesComponent,
        canActivate: [permissionGuard],
        data: { permission: 'quotes.view' },
      },
      {
        path: 'commercial/template-pricing',
        component: TemplatePricingComponent,
        canActivate: [permissionGuard],
        data: { permission: 'settings.view' },
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
