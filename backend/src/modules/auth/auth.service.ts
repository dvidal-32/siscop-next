import { Injectable, ConflictException, UnauthorizedException, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../shared/database/prisma.service';
import { MailerService } from './mailer.service';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as fs from 'fs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  // Helper to hash refresh tokens
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async registerTenant(dto: RegisterTenantDto) {
    // 1. Validar unicidad de slug de Tenant
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
    });
    if (existingTenant) {
      throw new ConflictException('El slug de la empresa ya está en uso');
    }

    // 2. Validar unicidad del correo del administrador
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.adminEmail },
    });
    if (existingUser) {
      throw new ConflictException('El correo del administrador ya está registrado');
    }

    // 3. Obtener o crear un Plan por defecto (Básico)
    let plan = await this.prisma.plan.findUnique({
      where: { code: 'basic' },
    });

    if (!plan) {
      plan = await this.prisma.plan.create({
        data: {
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
    }

    // 4. Asegurar que existan permisos por defecto para poder asignárselos al Administrador
    const defaultPermissions = [
      { code: 'dashboard.view', name: 'Ver Dashboard', module: 'dashboard', action: 'view' },
      { code: 'users.view', name: 'Ver Usuarios', module: 'users', action: 'view' },
      { code: 'users.create', name: 'Crear Usuarios', module: 'users', action: 'create' },
      { code: 'users.update', name: 'Editar Usuarios', module: 'users', action: 'update' },
      { code: 'users.delete', name: 'Eliminar Usuarios', module: 'users', action: 'delete' },
      { code: 'roles.view', name: 'Ver Roles', module: 'roles', action: 'view' },
      { code: 'roles.create', name: 'Crear Roles', module: 'roles', action: 'create' },
      { code: 'roles.update', name: 'Editar Roles', module: 'roles', action: 'update' },
      { code: 'roles.delete', name: 'Eliminar Roles', module: 'roles', action: 'delete' },
      { code: 'settings.view', name: 'Ver Mi Empresa', module: 'settings', action: 'view' },
      { code: 'settings.update', name: 'Editar Mi Empresa', module: 'settings', action: 'update' },
      { code: 'audit.view', name: 'Ver Auditoría', module: 'audit', action: 'view' },
      { code: 'billing.view', name: 'Ver Facturación', module: 'billing', action: 'view' },
      { code: 'billing.pay', name: 'Pagar Facturas', module: 'billing', action: 'pay' },
      // Commercial
      { code: 'clients.view',   name: 'Ver Clientes',    module: 'clients', action: 'view' },
      { code: 'clients.create', name: 'Crear Clientes',  module: 'clients', action: 'create' },
      { code: 'clients.update', name: 'Editar Clientes', module: 'clients', action: 'update' },
      { code: 'clients.delete', name: 'Eliminar Clientes', module: 'clients', action: 'delete' },
      { code: 'projects.view',   name: 'Ver Proyectos',    module: 'projects', action: 'view' },
      { code: 'projects.create', name: 'Crear Proyectos',  module: 'projects', action: 'create' },
      { code: 'projects.update', name: 'Editar Proyectos', module: 'projects', action: 'update' },
      { code: 'projects.delete', name: 'Eliminar Proyectos', module: 'projects', action: 'delete' },
      { code: 'quotes.view',    name: 'Ver Cotizaciones',      module: 'quotes', action: 'view' },
      { code: 'quotes.create',  name: 'Crear Cotizaciones',    module: 'quotes', action: 'create' },
      { code: 'quotes.update',  name: 'Editar Cotizaciones',   module: 'quotes', action: 'update' },
      { code: 'quotes.delete',  name: 'Eliminar Cotizaciones', module: 'quotes', action: 'delete' },
      { code: 'quotes.approve', name: 'Aprobar Cotizaciones',  module: 'quotes', action: 'approve' },
      // Engineering
      { code: 'engineering.view', name: 'Ver Ingeniería', module: 'engineering', action: 'view' },
      { code: 'engineering.create', name: 'Crear Plantillas de Ingeniería', module: 'engineering', action: 'create' },
      { code: 'engineering.update', name: 'Editar Plantillas de Ingeniería', module: 'engineering', action: 'update' },
      { code: 'engineering.delete', name: 'Eliminar Plantillas de Ingeniería', module: 'engineering', action: 'delete' },
      { code: 'engineering.simulate', name: 'Ejecutar Simulador de Ingeniería', module: 'engineering', action: 'simulate' },
      { code: 'engineering.import', name: 'Importar Plantillas Globales', module: 'engineering', action: 'import' },
    ];

    for (const perm of defaultPermissions) {
      await this.prisma.permission.upsert({
        where: { code: perm.code },
        update: {},
        create: perm,
      });
    }

    // 5. Hash de contraseña
    const passwordHash = await bcrypt.hash(dto.adminPassword, 10);

    // 6. Transacción para crear Tenant, Rol Admin, Usuario Admin, y Suscripción
    const result = await this.prisma.$transaction(async (tx) => {
      // 2. Crear Tenant (empresa)
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName,
          slug: dto.tenantSlug,
          legal_name: dto.legalName,
          tax_id: dto.taxId,
          phone: dto.phone,
          country: dto.country,
          email: dto.adminEmail, // Se guarda el email de registro como contacto
          status: 'pending',
          plan_id: plan.id,
        },
      });

      // Crear configuraciones iniciales de moneda si existen
      if (dto.currencyCode && dto.currencySymbol && dto.currencyLocale) {
        await tx.tenantSetting.createMany({
          data: [
            { tenant_id: tenant.id, key: 'MONEDA_CODIGO', value: dto.currencyCode, value_type: 'string' },
            { tenant_id: tenant.id, key: 'MONEDA_SIMBOLO', value: dto.currencySymbol, value_type: 'string' },
            { tenant_id: tenant.id, key: 'MONEDA_LOCALE', value: dto.currencyLocale, value_type: 'string' },
          ]
        });
      }

      // Crear Usuario Administrador
      const user = await tx.user.create({
        data: {
          tenant_id: tenant.id,
          email: dto.adminEmail,
          password_hash: passwordHash,
          first_name: dto.adminFirstName,
          last_name: dto.adminLastName,
          status: 'pending',
        },
      });

      // Crear Rol "Administrador" para el Tenant
      const role = await tx.role.create({
        data: {
          tenant_id: tenant.id,
          name: 'Administrador',
          description: 'Rol de administración con todos los privilegios del tenant',
          is_system_role: true,
          is_active: true,
        },
      });

      // Obtener los permisos correspondientes al tenant (sin incluir los de SuperAdmin global)
      const defaultPermissionCodes = defaultPermissions.map(p => p.code);
      const allPermissions = await tx.permission.findMany({
        where: { code: { in: defaultPermissionCodes } }
      });

      // Mapear y crear relaciones de RolePermission
      await tx.rolePermission.createMany({
        data: allPermissions.map((perm) => ({
          role_id: role.id,
          permission_id: perm.id,
        })),
      });

      // Vincular Usuario al Rol
      await tx.userRole.create({
        data: {
          user_id: user.id,
          role_id: role.id,
        },
      });

      return { tenant, user };
    });

    // Generar token de verificación
    const secret = this.configService.get<string>('JWT_SECRET') || 'siscop_next_secret_key_123';
    const verifyToken = await this.jwtService.signAsync(
      { sub: result.user.id, tenant: result.tenant.id, purpose: 'email_verification' },
      { expiresIn: '24h', secret }
    );

    // Enviar correo de verificación
    const verifyLink = `http://localhost:4200/verify-email?token=${verifyToken}`;
    const emailHtml = `
      <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
        <h2>¡Bienvenido a Siscop Next!</h2>
        <p>Hola ${dto.adminFirstName},</p>
        <p>Gracias por registrar a <strong>${dto.tenantName}</strong>. Para activar tu cuenta y poder iniciar sesión, por favor verifica tu dirección de correo electrónico haciendo clic en el siguiente botón:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyLink}" style="background-color: #1474c9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Verificar mi correo electrónico</a>
        </div>
        <p>Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:</p>
        <p><a href="${verifyLink}">${verifyLink}</a></p>
        <p>Este enlace expirará en 24 horas.</p>
      </div>
    `;
    await this.mailerService.sendMail(dto.adminEmail, 'Verifica tu cuenta de Siscop Next', emailHtml);

    return {
      message: 'Empresa registrada correctamente. Por favor, verifica tu correo electrónico.',
      tenantId: result.tenant.id,
      adminId: result.user.id,
    };
  }

  async login(dto: LoginDto) {
    // 1. Buscar usuario
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 2. Validar contraseña
    const passwordMatch = await bcrypt.compare(dto.password, user.password_hash);
    fs.appendFileSync('test-log.txt', `\n--- LOGIN ATTEMPT ---\nEmail: ${dto.email}\nProvided password: ${dto.password}\nHash in DB: ${user.password_hash}\nMatch: ${passwordMatch}\n`);
    
    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.status === 'pending') {
      throw new ForbiddenException('Por favor, verifica tu correo electrónico antes de iniciar sesión.');
    }

    // 3. Validar estado del usuario
    if (user.status !== 'active') {
      throw new UnauthorizedException('Usuario inactivo o bloqueado');
    }

    // 4. Validar estado del tenant (si tiene)
    if (user.tenant_id && user.tenant && user.tenant.status !== 'active') {
      throw new ForbiddenException('La empresa asociada a este usuario está suspendida');
    }

    // 5. Generar Tokens
    const tokens = await this.generateTokens(user.id, user.email, user.tenant_id);

    // 6. Almacenar el hash del Refresh Token en Base de Datos
    const tokenHash = this.hashToken(tokens.refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 días de duración del refresh token

    await this.prisma.refreshToken.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });

    // 7. Retornar datos
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        tenantId: user.tenant_id,
      },
    };
  }

  async refreshToken(userId: string, tenantId: string, email: string, oldRefreshToken: string) {
    const tokenHash = this.hashToken(oldRefreshToken);

    // Buscar el refresh token en base de datos
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        token_hash: tokenHash,
        user_id: userId,
        revoked_at: null,
      },
    });

    if (!storedToken || new Date() > storedToken.expires_at) {
      throw new UnauthorizedException('Token de actualización inválido o expirado');
    }

    // Revocar el token viejo
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked_at: new Date() },
    });

    // Generar nuevos tokens (Rotación de Refresh Tokens)
    const tokens = await this.generateTokens(userId, email, tenantId);

    // Guardar el nuevo refresh token
    const newHash = this.hashToken(tokens.refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        user_id: userId,
        token_hash: newHash,
        expires_at: expiresAt,
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(userId: string, refreshToken: string) {
    if (!refreshToken) {
      return { message: 'Sesión cerrada correctamente' };
    }

    const tokenHash = this.hashToken(refreshToken);

    // Buscar y revocar el token de actualización
    const token = await this.prisma.refreshToken.findFirst({
      where: {
        token_hash: tokenHash,
        user_id: userId,
        revoked_at: null,
      },
    });

    if (token) {
      await this.prisma.refreshToken.update({
        where: { id: token.id },
        data: { revoked_at: new Date() },
      });
    }

    return { message: 'Sesión cerrada correctamente' };
  }

  // Helper para generar el par de Access Token y Refresh Token
  private async generateTokens(userId: string, email: string, tenantId: string | null) {
    const payload = { sub: userId, email, tenantId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'siscop_next_secret_key_123',
        expiresIn: (process.env.JWT_EXPIRATION || '15m') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'siscop_next_refresh_secret_key_456',
        expiresIn: (process.env.JWT_REFRESH_EXPIRATION || '7d') as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      // For security, don't throw an error if user doesn't exist, just return.
      // This prevents email enumeration attacks.
      return;
    }

    // Generate JWT reset token
    const secret = this.configService.get<string>('JWT_SECRET') || 'siscop_next_secret_key_123';
    const resetToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        hash: user.password_hash.substring(0, 15), // store a hash signature for invalidation on change
      },
      {
        secret,
        expiresIn: '15m',
      },
    );

    const clientUrl = this.configService.get<string>('CLIENT_URL') || 'http://localhost:4200';
    const recoveryUrl = `${clientUrl}/reset-password?token=${resetToken}`;

    const subject = 'Recuperación de Contraseña - SISCOP NEXT';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a; text-align: center;">Recuperación de Contraseña</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          Has solicitado reestablecer tu contraseña en SISCOP NEXT. Haz clic en el siguiente enlace para crear una nueva contraseña. Este enlace expirará en 15 minutos:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${recoveryUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">Reestablecer Contraseña</a>
        </div>
        <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
          Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
        </p>
      </div>
    `;

    await this.mailerService.sendMail(user.email, subject, html);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const secret = this.configService.get<string>('JWT_SECRET') || 'siscop_next_secret_key_123';
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token, { secret });
    } catch (err) {
      throw new BadRequestException('El enlace de recuperación es inválido o ha expirado.');
    }

    const userId = payload.sub;
    const originalHashSignature = payload.hash;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new BadRequestException('Usuario no encontrado.');
    }

    // Verify token has not been used (current password hash must match the signature inside token)
    const currentHashSignature = user.password_hash.substring(0, 15);
    if (currentHashSignature !== originalHashSignature) {
      throw new BadRequestException('El enlace de recuperación ya ha sido utilizado.');
    }

    // Hash new password and update user
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password_changed_at: new Date(),
      },
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const secret = this.configService.get<string>('JWT_SECRET') || 'siscop_next_secret_key_123';
    try {
      const payload = await this.jwtService.verifyAsync(token, { secret });
      
      if (payload.purpose !== 'email_verification') {
        throw new BadRequestException('Token inválido');
      }

      const userId = payload.sub;
      const tenantId = payload.tenant;

      // Actualizar usuario
      await this.prisma.user.update({
        where: { id: userId },
        data: { status: 'active' },
      });

      // Actualizar tenant
      if (tenantId) {
        await this.prisma.tenant.update({
          where: { id: tenantId },
          data: { status: 'active' },
        });
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('El enlace de verificación es inválido o ha expirado.');
    }
  }
}
