import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './shared/database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from './modules/auth/guards/subscription.guard';
import { PermissionsGuard } from './modules/auth/guards/permissions.guard';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsersModule } from './modules/users/users.module';
import { AuditModule } from './modules/audit/audit.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { PlansModule } from './modules/plans/plans.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { SettingsModule } from './modules/settings/settings.module';
import { PlatformSettingsModule } from './modules/platform-settings/platform-settings.module';
import { MenuModule } from './modules/menu/menu.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { TaxesModule } from './modules/taxes/taxes.module';
import { CatalogSystemsModule } from './modules/catalog-systems/catalog-systems.module';
import { CatalogFinishesModule } from './modules/catalog-finishes/catalog-finishes.module';
import { CatalogItemsModule } from './modules/catalog-items/catalog-items.module';
import { EngineeringModule } from './modules/engineering/engineering.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    PrismaModule,
    AuthModule,
    PermissionsModule,
    RolesModule,
    UsersModule,
    AuditModule,
    TenantsModule,
    PlansModule,
    SubscriptionsModule,
    SettingsModule,
    PlatformSettingsModule,
    MenuModule,
    PaymentsModule,
    TaxesModule,
    CatalogSystemsModule,
    CatalogFinishesModule,
    CatalogItemsModule,
    EngineeringModule,
    ClientsModule,
    ProjectsModule,
    QuotesModule,
    SuppliersModule,
    WarehousesModule,
    InventoryModule,
    PurchaseOrdersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SubscriptionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
