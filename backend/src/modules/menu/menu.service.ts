import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import * as bcrypt from 'bcrypt';


@Injectable()
export class MenuService implements OnApplicationBootstrap {
  constructor(private prisma: PrismaService) {}

  async onApplicationBootstrap() {
    await this.seedDefaultMenu();
    await this.assureBillingPermissions();
    await this.assureEngineeringPermissions();
    await this.seedDefaultPlans();
    await this.seedSuperAdminAndPlatformSettings();
  }

  private async seedDefaultMenu() {
    // Delete deprecated/unused admin.settings, billing and old audit items
    await this.prisma.menuItem.deleteMany({
      where: {
        code: {
          in: ['admin.settings', 'billing', 'audit'],
        },
      },
    });

    const count = await this.prisma.menuItem.count();
    if (count > 0) {
      // 1. Ensure "Operaciones" parent exists
      let operationsParent = await this.prisma.menuItem.findUnique({
        where: { code: 'operations' },
      });
      if (!operationsParent) {
        operationsParent = await this.prisma.menuItem.create({
          data: {
            code: 'operations',
            label: 'Materiales y Sistemas',
            route: '',
            icon: 'build',
            order: 2,
          },
        });
      } else {
        operationsParent = await this.prisma.menuItem.update({
          where: { code: 'operations' },
          data: { label: 'Materiales y Sistemas' },
        });
      }

      const adminParent = await this.prisma.menuItem.findUnique({
        where: { code: 'admin' },
      });

      // 2. Re-order main parents to accommodate "Operaciones" at order 2
      await this.prisma.menuItem.updateMany({
        where: { code: 'dashboard' },
        data: { order: 0 },
      });
      await this.prisma.menuItem.updateMany({
        where: { code: 'admin' },
        data: { order: 1 },
      });
      await this.prisma.menuItem.updateMany({
        where: { code: 'operations' },
        data: { order: 2 },
      });

      // 3. Move and ensure audit under admin
      if (adminParent) {
        const auditExists = await this.prisma.menuItem.findFirst({
          where: { code: { in: ['audit', 'admin.audit'] } },
        });
        if (!auditExists) {
          await this.prisma.menuItem.create({
            data: {
              parent_id: adminParent.id,
              code: 'admin.audit',
              label: 'Auditoría',
              route: '/audit-logs',
              icon: 'history',
              required_permission: 'audit.view',
              order: 3,
            },
          });
        } else {
          await this.prisma.menuItem.update({
            where: { id: auditExists.id },
            data: {
              parent_id: adminParent.id,
              code: 'admin.audit',
              order: 3,
            },
          });
        }
      }

      // 4. Move and ensure lines-colors under operations
      const linesColorsExists = await this.prisma.menuItem.findUnique({ where: { code: 'admin.lines-colors' } });
      if (!linesColorsExists) {
        await this.prisma.menuItem.create({
          data: {
            parent_id: operationsParent.id,
            code: 'admin.lines-colors',
            label: 'Líneas y Acabados',
            route: '/admin/lines-colors',
            icon: 'palette',
            required_permission: 'settings.view',
            order: 0,
          },
        });
      } else {
        await this.prisma.menuItem.update({
          where: { code: 'admin.lines-colors' },
          data: {
            parent_id: operationsParent.id,
            order: 0,
          },
        });
      }

      // 5. Move and ensure catalog under operations
      const catalogExists = await this.prisma.menuItem.findUnique({ where: { code: 'admin.catalog' } });
      if (!catalogExists) {
        await this.prisma.menuItem.create({
          data: {
            parent_id: operationsParent.id,
            code: 'admin.catalog',
            label: 'Catálogo de Materiales',
            route: '/admin/catalog',
            icon: 'folder_open',
            required_permission: 'settings.view',
            order: 1,
          },
        });
      } else {
        await this.prisma.menuItem.update({
          where: { code: 'admin.catalog' },
          data: {
            parent_id: operationsParent.id,
            order: 1,
          },
        });
      }

      // 6. Ensure "Ingeniería de Productos" parent exists
      let engineeringParent = await this.prisma.menuItem.findUnique({
        where: { code: 'engineering' },
      });
      if (!engineeringParent) {
        engineeringParent = await this.prisma.menuItem.create({
          data: {
            code: 'engineering',
            label: 'Ingeniería de Productos',
            route: '',
            icon: 'precision_manufacturing',
            order: 3,
          },
        });

        // Re-order superadmin parent if exists
        await this.prisma.menuItem.updateMany({
          where: { code: 'superadmin' },
          data: { order: 4 },
        });
      }

      // 7. Ensure engineering children
      const engineeringChildren = [
        { code: 'engineering.templates', label: 'Plantillas de Productos', route: '/engineering/templates', icon: 'category', permission: 'engineering.view', order: 0 },
        { code: 'engineering.formulas', label: 'Variables y Fórmulas', route: '/engineering/formulas', icon: 'functions', permission: 'engineering.view', order: 1 },
        { code: 'engineering.simulator', label: 'Simulador', route: '/engineering/simulator', icon: 'science', permission: 'engineering.simulate', order: 2 },
        { code: 'engineering.library', label: 'Biblioteca Global', route: '/engineering/library', icon: 'cloud_download', permission: 'engineering.import', order: 3 },
      ];

      for (const child of engineeringChildren) {
        const exists = await this.prisma.menuItem.findUnique({ where: { code: child.code } });
        if (!exists) {
          await this.prisma.menuItem.create({
            data: {
              parent_id: engineeringParent.id,
              code: child.code,
              label: child.label,
              route: child.route,
              icon: child.icon,
              required_permission: child.permission,
              order: child.order,
            },
          });
        }
      }

      return;
    }

    // Seed Parents
    const dashboard = await this.prisma.menuItem.create({
      data: {
        code: 'dashboard',
        label: 'Dashboard',
        route: '/dashboard',
        icon: 'dashboard',
        order: 0,
      },
    });

    const admin = await this.prisma.menuItem.create({
      data: {
        code: 'admin',
        label: 'Administración',
        route: '',
        icon: 'admin_panel_settings',
        order: 1,
      },
    });

    const operations = await this.prisma.menuItem.create({
      data: {
        code: 'operations',
        label: 'Materiales y Sistemas',
        route: '',
        icon: 'build',
        order: 2,
      },
    });

    // Seed Children of Administration
    await this.prisma.menuItem.createMany({
      data: [
        {
          parent_id: admin.id,
          code: 'admin.company',
          label: 'Mi Empresa',
          route: '/admin/company',
          icon: 'business',
          required_permission: 'settings.view',
          order: 0,
        },
        {
          parent_id: admin.id,
          code: 'admin.users',
          label: 'Usuarios',
          route: '/admin/users',
          icon: 'people',
          required_permission: 'users.view',
          order: 1,
        },
        {
          parent_id: admin.id,
          code: 'admin.roles',
          label: 'Roles y Permisos',
          route: '/admin/roles',
          icon: 'security',
          required_permission: 'roles.view',
          order: 2,
        },
        {
          parent_id: admin.id,
          code: 'admin.audit',
          label: 'Auditoría',
          route: '/audit-logs',
          icon: 'history',
          required_permission: 'audit.view',
          order: 3,
        },
      ],
    });

    // Seed Children of Operations
    await this.prisma.menuItem.createMany({
      data: [
        {
          parent_id: operations.id,
          code: 'admin.lines-colors',
          label: 'Líneas y Acabados',
          route: '/admin/lines-colors',
          icon: 'palette',
          required_permission: 'settings.view',
          order: 0,
        },
        {
          parent_id: operations.id,
          code: 'admin.catalog',
          label: 'Catálogo de Materiales',
          route: '/admin/catalog',
          icon: 'folder_open',
          required_permission: 'settings.view',
          order: 1,
        },
      ],
    });

    // Seed Parent: Ingeniería de Productos
    const engineering = await this.prisma.menuItem.create({
      data: {
        code: 'engineering',
        label: 'Ingeniería de Productos',
        route: '',
        icon: 'precision_manufacturing',
        order: 3,
      },
    });

    // Seed Children of Engineering
    await this.prisma.menuItem.createMany({
      data: [
        {
          parent_id: engineering.id,
          code: 'engineering.templates',
          label: 'Plantillas de Productos',
          route: '/engineering/templates',
          icon: 'category',
          required_permission: 'engineering.view',
          order: 0,
        },
        {
          parent_id: engineering.id,
          code: 'engineering.formulas',
          label: 'Variables y Fórmulas',
          route: '/engineering/formulas',
          icon: 'functions',
          required_permission: 'engineering.view',
          order: 1,
        },
        {
          parent_id: engineering.id,
          code: 'engineering.simulator',
          label: 'Simulador',
          route: '/engineering/simulator',
          icon: 'science',
          required_permission: 'engineering.simulate',
          order: 2,
        },
        {
          parent_id: engineering.id,
          code: 'engineering.library',
          label: 'Biblioteca Global',
          route: '/engineering/library',
          icon: 'cloud_download',
          required_permission: 'engineering.import',
          order: 3,
        },
      ],
    });
  }

  async getMenuForUser(permissions: string[]) {
    const allItems = await this.prisma.menuItem.findMany({
      where: { is_active: true },
      orderBy: { order: 'asc' },
    });

    const allowedItems = allItems.filter((item) => {
      if (!item.required_permission) return true;
      return permissions.includes(item.required_permission);
    });

    const parentMap = new Map<string, any>();
    const roots: any[] = [];

    allowedItems.forEach((item) => {
      parentMap.set(item.id, {
        id: item.id,
        code: item.code,
        label: item.label,
        route: item.route,
        icon: item.icon,
        order: item.order,
        children: [],
      });
    });

    allowedItems.forEach((item) => {
      const formattedItem = parentMap.get(item.id);
      if (item.parent_id) {
        const parent = parentMap.get(item.parent_id);
        if (parent) {
          parent.children.push(formattedItem);
        }
      } else {
        roots.push(formattedItem);
      }
    });

    // Remove navigation folders if they contain no accessible pages
    return roots.filter((root) => {
      if (root.route === '' && root.children.length === 0) {
        return false;
      }
      return true;
    });
  }

  private async assureBillingPermissions() {
    // 1. Ensure permissions exist in database
    const billingView = await this.prisma.permission.upsert({
      where: { code: 'billing.view' },
      update: {},
      create: { code: 'billing.view', name: 'Ver Facturación', module: 'billing', action: 'view' },
    });

    const billingPay = await this.prisma.permission.upsert({
      where: { code: 'billing.pay' },
      update: {},
      create: { code: 'billing.pay', name: 'Pagar Facturas', module: 'billing', action: 'pay' },
    });

    // 2. Find all Administrator roles
    const adminRoles = await this.prisma.role.findMany({
      where: { name: 'Administrador' },
    });

    // 3. Bind billing permissions to each Administrator role
    for (const role of adminRoles) {
      // billing.view
      const hasView = await this.prisma.rolePermission.findUnique({
        where: {
          role_id_permission_id: {
            role_id: role.id,
            permission_id: billingView.id,
          },
        },
      });
      if (!hasView) {
        await this.prisma.rolePermission.create({
          data: {
            role_id: role.id,
            permission_id: billingView.id,
          },
        });
      }

      // billing.pay
      const hasPay = await this.prisma.rolePermission.findUnique({
        where: {
          role_id_permission_id: {
            role_id: role.id,
            permission_id: billingPay.id,
          },
        },
      });
      if (!hasPay) {
        await this.prisma.rolePermission.create({
          data: {
            role_id: role.id,
            permission_id: billingPay.id,
          },
        });
      }
    }
  }

  private async assureEngineeringPermissions() {
    const permissionsToAssure = [
      { code: 'engineering.view', name: 'Ver Ingeniería', module: 'engineering', action: 'view' },
      { code: 'engineering.create', name: 'Crear Plantillas de Ingeniería', module: 'engineering', action: 'create' },
      { code: 'engineering.update', name: 'Editar Plantillas de Ingeniería', module: 'engineering', action: 'update' },
      { code: 'engineering.delete', name: 'Eliminar Plantillas de Ingeniería', module: 'engineering', action: 'delete' },
      { code: 'engineering.simulate', name: 'Ejecutar Simulador de Ingeniería', module: 'engineering', action: 'simulate' },
      { code: 'engineering.import', name: 'Importar Plantillas Globales', module: 'engineering', action: 'import' },
    ];

    const dbPermissions: any[] = [];
    for (const perm of permissionsToAssure) {
      const dbPerm = await this.prisma.permission.upsert({
        where: { code: perm.code },
        update: {},
        create: perm,
      });
      dbPermissions.push(dbPerm);
    }

    const adminRoles = await this.prisma.role.findMany({
      where: { name: 'Administrador' },
    });

    for (const role of adminRoles) {
      for (const perm of dbPermissions) {
        const hasPermission = await this.prisma.rolePermission.findUnique({
          where: {
            role_id_permission_id: {
              role_id: role.id,
              permission_id: perm.id,
            },
          },
        });
        if (!hasPermission) {
          await this.prisma.rolePermission.create({
            data: {
              role_id: role.id,
              permission_id: perm.id,
            },
          });
        }
      }
    }
  }

  private async seedDefaultPlans() {
    // Plan Demo
    await this.prisma.plan.upsert({
      where: { code: 'demo' },
      update: {},
      create: {
        code: 'demo',
        name: 'Plan Demo',
        description: 'Plan de prueba gratuito por un mes, limitado a 2 usuarios',
        price: 0.00,
        billing_cycle: 'monthly',
        max_users: 2,
        max_storage_mb: 1024,
        is_active: true,
      },
    });

    // Plan Básico
    await this.prisma.plan.upsert({
      where: { code: 'basic' },
      update: {},
      create: {
        code: 'basic',
        name: 'Plan Básico',
        description: 'Acceso inicial para pequeñas y medianas empresas',
        price: 19.99,
        billing_cycle: 'monthly',
        max_users: 5,
        max_storage_mb: 1024,
        is_active: true,
      },
    });

    // Plan Profesional
    await this.prisma.plan.upsert({
      where: { code: 'pro' },
      update: {},
      create: {
        code: 'pro',
        name: 'Plan Profesional',
        description: 'Acceso intermedio para empresas en crecimiento con necesidades avanzadas',
        price: 49.99,
        billing_cycle: 'monthly',
        max_users: 20,
        max_storage_mb: 5120,
        is_active: true,
      },
    });

    // Plan Corporativo
    await this.prisma.plan.upsert({
      where: { code: 'enterprise' },
      update: {},
      create: {
        code: 'enterprise',
        name: 'Plan Corporativo',
        description: 'Acceso premium con soporte prioritario y recursos escalables para grandes corporaciones',
        price: 99.99,
        billing_cycle: 'monthly',
        max_users: 100,
        max_storage_mb: 20480,
        is_active: true,
      },
    });
  }

  private async seedSuperAdminAndPlatformSettings() {
    // 1. Seed global permissions
    const superAdminPermissions = [
      { code: 'plans.view', name: 'Ver Planes', module: 'plans', action: 'view' },
      { code: 'plans.create', name: 'Crear Planes', module: 'plans', action: 'create' },
      { code: 'plans.update', name: 'Editar Planes', module: 'plans', action: 'update' },
      { code: 'plans.delete', name: 'Eliminar Planes', module: 'plans', action: 'delete' },
      { code: 'platform-settings.view', name: 'Ver Ajustes de Plataforma', module: 'platform-settings', action: 'view' },
      { code: 'platform-settings.update', name: 'Editar Ajustes de Plataforma', module: 'platform-settings', action: 'update' },
      { code: 'tenants.view', name: 'Ver Tenants', module: 'tenants', action: 'view' },
      { code: 'tenants.update', name: 'Editar Tenants', module: 'tenants', action: 'update' },
      { code: 'tenants.suspend', name: 'Suspender Tenants', module: 'tenants', action: 'suspend' },
      { code: 'tenants.activate', name: 'Activar Tenants', module: 'tenants', action: 'activate' },
      // Permisos de Ingeniería (Tenant)
      { code: 'engineering.view', name: 'Ver Ingeniería', module: 'engineering', action: 'view' },
      { code: 'engineering.create', name: 'Crear Plantillas de Ingeniería', module: 'engineering', action: 'create' },
      { code: 'engineering.update', name: 'Editar Plantillas de Ingeniería', module: 'engineering', action: 'update' },
      { code: 'engineering.delete', name: 'Eliminar Plantillas de Ingeniería', module: 'engineering', action: 'delete' },
      { code: 'engineering.simulate', name: 'Ejecutar Simulador de Ingeniería', module: 'engineering', action: 'simulate' },
      { code: 'engineering.import', name: 'Importar Plantillas Globales', module: 'engineering', action: 'import' },
      // Permisos de Biblioteca Global (SuperAdmin)
      { code: 'library.view', name: 'Ver Biblioteca Global', module: 'library', action: 'view' },
      { code: 'library.create', name: 'Crear en Biblioteca Global', module: 'library', action: 'create' },
      { code: 'library.update', name: 'Editar Biblioteca Global', module: 'library', action: 'update' },
      { code: 'library.delete', name: 'Eliminar de Biblioteca Global', module: 'library', action: 'delete' },
    ];

    for (const perm of superAdminPermissions) {
      await this.prisma.permission.upsert({
        where: { code: perm.code },
        update: {},
        create: perm,
      });
    }

    // 2. Assure global "Super Administrador" role
    let superAdminRole = await this.prisma.role.findFirst({
      where: { name: 'Super Administrador', tenant_id: null },
    });

    if (!superAdminRole) {
      superAdminRole = await this.prisma.role.create({
        data: {
          name: 'Super Administrador',
          description: 'Rol global con acceso completo a la administración de la plataforma',
          is_system_role: true,
          is_active: true,
          tenant_id: null,
        },
      });
    }

    // 3. Bind all permissions (existing + new) to Super Administrador
    const allPermissions = await this.prisma.permission.findMany();
    for (const perm of allPermissions) {
      const hasPermission = await this.prisma.rolePermission.findUnique({
        where: {
          role_id_permission_id: {
            role_id: superAdminRole.id,
            permission_id: perm.id,
          },
        },
      });
      if (!hasPermission) {
        await this.prisma.rolePermission.create({
          data: {
            role_id: superAdminRole.id,
            permission_id: perm.id,
          },
        });
      }
    }

    // 4. Create default Super Admin user if not exists
    const superAdminEmail = 'superadmin@siscop.next';
    let superUser = await this.prisma.user.findUnique({
      where: { email: superAdminEmail },
    });

    if (!superUser) {
      const passwordHash = await bcrypt.hash('SuperPassword123!', 10);
      superUser = await this.prisma.user.create({
        data: {
          email: superAdminEmail,
          password_hash: passwordHash,
          first_name: 'Super',
          last_name: 'Administrador',
          status: 'active',
          tenant_id: null,
        },
      });

      // Bind user to role
      await this.prisma.userRole.create({
        data: {
          user_id: superUser.id,
          role_id: superAdminRole.id,
        },
      });
    }

    // 5. Seed default PlatformSettings
    const defaultSettings = [
      { key: 'DEFAULT_TRIAL_DAYS', value: '30', value_type: 'number' },
      { key: 'PAYPAL_SANDBOX_CLIENT_ID', value: 'sb', value_type: 'string' },
      { key: 'PAYPAL_SANDBOX_CLIENT_SECRET', value: 'sb_secret', value_type: 'string' },
      { key: 'PAYPAL_LIVE_CLIENT_ID', value: '', value_type: 'string' },
      { key: 'PAYPAL_LIVE_CLIENT_SECRET', value: '', value_type: 'string' },
      { key: 'PAYPAL_MODE', value: 'sandbox', value_type: 'string' },
      { key: 'MAINTENANCE_MODE', value: 'false', value_type: 'boolean' },
    ];

    for (const setting of defaultSettings) {
      await this.prisma.platformSetting.upsert({
        where: { key: setting.key },
        update: {},
        create: setting,
      });
    }

    // 6. Seed Super Admin Menu Items
    let superadminParent = await this.prisma.menuItem.findUnique({
      where: { code: 'superadmin' },
    });

    if (!superadminParent) {
      superadminParent = await this.prisma.menuItem.create({
        data: {
          code: 'superadmin',
          label: 'Plataforma',
          route: '',
          icon: 'admin_panel_settings',
          required_permission: 'plans.view',
          order: 3,
        },
      });
    }

    // Plans management menu child
    const plansMgmtMenu = await this.prisma.menuItem.findUnique({
      where: { code: 'superadmin.plans' },
    });
    if (!plansMgmtMenu) {
      await this.prisma.menuItem.create({
        data: {
          parent_id: superadminParent.id,
          code: 'superadmin.plans',
          label: 'Planes SaaS',
          route: '/admin/plans-mgmt',
          icon: 'payment',
          required_permission: 'plans.view',
          order: 0,
        },
      });
    }

    // System settings menu child
    const platformSettingsMenu = await this.prisma.menuItem.findUnique({
      where: { code: 'superadmin.settings' },
    });
    if (!platformSettingsMenu) {
      await this.prisma.menuItem.create({
        data: {
          parent_id: superadminParent.id,
          code: 'superadmin.settings',
          label: 'Ajustes de Plataforma',
          route: '/admin/platform-settings',
          icon: 'settings',
          required_permission: 'platform-settings.view',
          order: 1,
        },
      });
    }

    // Tenants management menu child
    const tenantsMgmtMenu = await this.prisma.menuItem.findUnique({
      where: { code: 'superadmin.tenants' },
    });
    if (!tenantsMgmtMenu) {
      await this.prisma.menuItem.create({
        data: {
          parent_id: superadminParent.id,
          code: 'superadmin.tenants',
          label: 'Empresas (Tenants)',
          route: '/admin/tenants',
          icon: 'business',
          required_permission: 'tenants.view',
          order: 2,
        },
      });
    }

    // Library menu child for SuperAdmin
    const libraryMenu = await this.prisma.menuItem.findUnique({
      where: { code: 'superadmin.library' },
    });
    if (!libraryMenu) {
      const libraryParent = await this.prisma.menuItem.create({
        data: {
          parent_id: superadminParent.id,
          code: 'superadmin.library',
          label: 'Biblioteca Global',
          route: '',
          icon: 'library_books',
          required_permission: 'library.view',
          order: 3,
        },
      });

      await this.prisma.menuItem.createMany({
        data: [
          {
            parent_id: libraryParent.id,
            code: 'superadmin.library.templates',
            label: 'Plantillas Globales',
            route: '/admin/library/templates',
            icon: 'category',
            required_permission: 'library.view',
            order: 0,
          },
          {
            parent_id: libraryParent.id,
            code: 'superadmin.library.items',
            label: 'Artículos Globales',
            route: '/admin/library/items',
            icon: 'inventory_2',
            required_permission: 'library.view',
            order: 1,
          },
        ],
      });
    } else if (libraryMenu.order !== 3) {
      await this.prisma.menuItem.update({
        where: { id: libraryMenu.id },
        data: { order: 3 },
      });
    }
  }
}

