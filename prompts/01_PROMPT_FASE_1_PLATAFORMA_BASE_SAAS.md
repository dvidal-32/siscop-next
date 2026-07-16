# 01_PROMPT_FASE_1_PLATAFORMA_BASE_SAAS.md

## PROMPT OPERATIVO — FASE 1  
# SISCOP NEXT — PLATAFORMA BASE SAAS

## 1. Contexto General

Actúa como arquitecto de software, analista técnico, diseñador de base de datos, especialista en SaaS multi-tenant y desarrollador senior full stack para el proyecto **SISCOP NEXT**.

Antes de responder o diseñar cualquier solución, debes asumir como obligatorio el documento:

`00_PROMPT_MAESTRO_SISCOP_NEXT.md`

Ese documento contiene la visión, principios rectores, tecnologías aprobadas, arquitectura general, modelo SaaS, fases, restricciones técnicas y reglas estratégicas del proyecto.

Este prompt corresponde exclusivamente a la:

# FASE 1 — PLATAFORMA BASE SAAS

La Fase 1 tiene como objetivo construir el núcleo común de la plataforma SaaS sobre el cual luego se desarrollarán los módulos industriales: catálogos, ingeniería, cotizaciones, producción, inventario, compras, instalación, reportes e integraciones.

En esta fase **no se debe desarrollar todavía lógica industrial de aluminio y vidrio**.  
No se deben implementar productos, perfiles, vidrios, accesorios, fórmulas, reglas de ingeniería, cotizaciones ni producción.

La prioridad de esta fase es dejar funcionando una plataforma web SaaS segura, multi-tenant, administrable y preparada para crecer.

---

## 2. Objetivo de la Fase 1

Diseñar e implementar la base funcional y técnica de SISCOP NEXT como plataforma SaaS multi-tenant.

Esta fase debe entregar una aplicación funcional con:

- Autenticación.
- Registro y administración de tenants.
- Administración de empresas.
- Usuarios.
- Roles.
- Permisos.
- Menú dinámico.
- Configuración básica.
- Planes.
- Suscripciones iniciales.
- Auditoría.
- Seguridad base.
- Estructura modular frontend/backend.
- Base de datos inicial.
- API documentada.
- Despliegue inicial en ambiente de desarrollo o staging.

El resultado esperado es una plataforma SaaS operativa, aunque todavía sin lógica propia del negocio de aluminio y vidrio.

---

## 3. Tecnologías Obligatorias

Usa las tecnologías definidas en el Prompt Maestro.

### Frontend

- Angular.
- TypeScript.
- Angular Material.
- SCSS.
- Reactive Forms.
- RxJS.
- Angular Signals cuando aplique.
- Angular Router.
- Guards de rutas.
- Interceptors HTTP.
- Layout modular.

### Backend

- NestJS.
- Node.js.
- TypeScript.
- REST API.
- Swagger / OpenAPI.
- Arquitectura modular.
- DTOs.
- Guards.
- Interceptors.
- Pipes.
- Exception filters.
- Services.
- Repositories.
- Casos de uso cuando aplique.

### Base de Datos

- PostgreSQL.
- Prisma ORM.
- Prisma Migrate.
- Diseño relacional.
- `tenant_id` en tablas críticas.
- Auditoría en operaciones sensibles.
- Índices adecuados.

### Seguridad

- JWT.
- Refresh Tokens.
- Argon2 preferiblemente.
- Bcrypt aceptable.
- RBAC.
- Validación estricta por tenant.
- Rate limiting donde aplique.
- Protección de rutas.
- Validación de entrada.
- Manejo seguro de errores.

### Infraestructura

- Docker.
- Docker Compose.
- Linux.
- Nginx en fases de despliegue.
- Variables de entorno.
- Separación de ambientes.
- Backups básicos para PostgreSQL.

---

## 4. Alcance de la Fase 1

La Fase 1 incluye los siguientes módulos:

1. Autenticación.
2. Tenants.
3. Empresas.
4. Usuarios.
5. Roles.
6. Permisos.
7. Planes.
8. Suscripciones básicas.
9. Configuración general.
10. Auditoría.
11. Seguridad.
12. Menú y navegación.
13. Layout principal.
14. Dashboard inicial.
15. Administración base del sistema.

---

## 5. Exclusiones de la Fase 1

No diseñes ni implementes todavía:

- Productos de aluminio.
- Familias de productos.
- Perfiles.
- Vidrios.
- Accesorios.
- Fórmulas de ingeniería.
- Reglas de ingeniería.
- Motor de ingeniería.
- Cotizaciones.
- Clientes comerciales.
- Producción.
- Inventario.
- Compras.
- Optimización de corte.
- Instalación.
- Reportes industriales.
- Marketplace.
- Aplicación móvil.
- Facturación electrónica.
- Integraciones externas complejas.

Si alguna de estas áreas se menciona, solo deja preparado el sistema para integrarlas en fases posteriores.

---

## 6. Principios Específicos de esta Fase

Toda solución propuesta para esta fase debe respetar estos principios:

1. La plataforma debe ser multi-tenant desde el primer día.
2. La seguridad multi-tenant no debe depender del frontend.
3. Toda operación sobre datos de empresa debe usar contexto de tenant.
4. Los usuarios pertenecen a un tenant.
5. Un usuario no debe ver ni modificar datos de otro tenant.
6. Los roles deben ser configurables.
7. Los permisos deben ser granulares.
8. El menú debe poder generarse según permisos.
9. Las operaciones críticas deben auditarse.
10. Las contraseñas nunca deben guardarse en texto plano.
11. Los refresh tokens deben poder revocarse.
12. El backend debe validar todo.
13. El frontend debe mejorar la experiencia, no sustituir las validaciones del backend.
14. La arquitectura debe permitir agregar módulos futuros sin romper la base.
15. La base de datos debe prepararse para crecimiento.
16. No se debe acoplar esta fase a lógica específica de aluminio y vidrio.

---

## 7. Modelo Funcional Esperado

La plataforma debe permitir estos flujos básicos:

### 7.1 Flujo de autenticación

1. El usuario entra al login.
2. Ingresa usuario/email y contraseña.
3. El backend valida credenciales.
4. El sistema identifica el tenant del usuario.
5. El backend genera access token y refresh token.
6. El frontend guarda la sesión de forma segura.
7. El usuario entra al dashboard según sus permisos.
8. El sistema carga menú y opciones permitidas.

### 7.2 Flujo de refresh token

1. El access token expira.
2. El frontend solicita renovación.
3. El backend valida el refresh token.
4. Si es válido, emite nuevo access token.
5. Si no es válido, cierra la sesión.

### 7.3 Flujo de administración de usuarios

1. Un administrador entra al módulo de usuarios.
2. Crea un nuevo usuario dentro de su tenant.
3. Asigna roles.
4. El sistema valida permisos.
5. El usuario queda activo o pendiente de activación.
6. La operación queda auditada.

### 7.4 Flujo de roles y permisos

1. Un administrador crea o edita un rol.
2. Asigna permisos al rol.
3. Los usuarios asociados heredan esos permisos.
4. El menú y las rutas responden a esos permisos.
5. Los endpoints también validan esos permisos.

### 7.5 Flujo de tenant

1. Un superadministrador crea un tenant.
2. Registra los datos de la empresa.
3. Asigna un plan.
4. Crea el usuario administrador inicial.
5. El tenant queda activo.
6. La empresa puede iniciar sesión y operar dentro de su propio espacio.

---

## 8. Roles Iniciales Recomendados

Diseña el sistema para manejar roles configurables, pero puedes proponer roles iniciales de referencia.

### Rol: Super Admin

Usuario interno de la plataforma SISCOP NEXT.

Puede:

- Crear tenants.
- Suspender tenants.
- Administrar planes.
- Ver auditoría global.
- Administrar configuración global.
- Acceder a información operativa de la plataforma según política de seguridad.

No debe usarse como usuario común de una empresa.

### Rol: Tenant Admin

Administrador de una empresa cliente.

Puede:

- Administrar usuarios de su empresa.
- Crear roles internos.
- Asignar permisos.
- Configurar datos de la empresa.
- Ver auditoría de su tenant.
- Acceder a módulos contratados según plan.

### Rol: Usuario Operativo

Usuario normal de una empresa.

Puede acceder solo a los módulos y acciones asignadas por roles y permisos.

### Rol: Solo Lectura

Usuario con permisos de consulta, útil para gerentes, auditores o supervisores.

---

## 9. Permisos Iniciales Recomendados

Diseña un sistema de permisos granular.

Formato sugerido:

`modulo.accion`

Ejemplos:

- `users.view`
- `users.create`
- `users.update`
- `users.delete`
- `roles.view`
- `roles.create`
- `roles.update`
- `roles.delete`
- `permissions.view`
- `tenants.view`
- `tenants.create`
- `tenants.update`
- `tenants.suspend`
- `settings.view`
- `settings.update`
- `plans.view`
- `plans.create`
- `plans.update`
- `subscriptions.view`
- `subscriptions.update`
- `audit.view`
- `dashboard.view`

Los permisos deben poder asociarse a roles.

El backend debe validar permisos en endpoints protegidos.

El frontend debe ocultar opciones no permitidas, pero nunca debe ser la única capa de seguridad.

---

## 10. Entidades Principales

Diseña el modelo de datos para esta fase considerando, como mínimo, estas entidades:

### 10.1 Tenant

Representa una empresa o cliente dentro de la plataforma.

Campos sugeridos:

- id
- name
- slug
- legal_name
- tax_id
- email
- phone
- status
- plan_id
- created_at
- updated_at
- created_by
- updated_by

### 10.2 User

Representa un usuario del sistema.

Campos sugeridos:

- id
- tenant_id
- email
- username
- password_hash
- first_name
- last_name
- phone
- status
- last_login_at
- password_changed_at
- created_at
- updated_at
- created_by
- updated_by

### 10.3 Role

Representa un rol dentro del sistema.

Campos sugeridos:

- id
- tenant_id
- name
- description
- is_system_role
- is_active
- created_at
- updated_at

Nota: algunos roles pueden ser globales o del sistema. Otros pertenecen a un tenant.

### 10.4 Permission

Representa una acción permitida.

Campos sugeridos:

- id
- code
- name
- description
- module
- action
- is_active

### 10.5 RolePermission

Relación entre roles y permisos.

Campos sugeridos:

- id
- role_id
- permission_id
- created_at

### 10.6 UserRole

Relación entre usuarios y roles.

Campos sugeridos:

- id
- user_id
- role_id
- created_at

### 10.7 RefreshToken

Control de sesiones renovables.

Campos sugeridos:

- id
- user_id
- token_hash
- expires_at
- revoked_at
- created_at
- created_by_ip
- user_agent

### 10.8 Plan

Representa un plan comercial de la plataforma.

Campos sugeridos:

- id
- code
- name
- description
- price
- billing_cycle
- max_users
- max_storage_mb
- is_active
- created_at
- updated_at

### 10.9 Subscription

Representa la suscripción de un tenant.

Campos sugeridos:

- id
- tenant_id
- plan_id
- status
- start_date
- end_date
- trial_ends_at
- cancelled_at
- created_at
- updated_at

### 10.10 TenantSetting

Configuraciones por tenant.

Campos sugeridos:

- id
- tenant_id
- key
- value
- value_type
- created_at
- updated_at

### 10.11 AuditLog

Registro de auditoría.

Campos sugeridos:

- id
- tenant_id
- user_id
- action
- module
- entity_name
- entity_id
- old_value
- new_value
- ip_address
- user_agent
- created_at

### 10.12 MenuItem

Opciones del menú.

Campos sugeridos:

- id
- parent_id
- code
- label
- route
- icon
- required_permission
- order
- is_active

---

## 11. Reglas de Base de Datos

Al diseñar la base de datos, cumple estas reglas:

1. Usar UUID o CUID para identificadores principales.
2. Incluir `tenant_id` en tablas de datos pertenecientes a empresa.
3. No incluir `tenant_id` en catálogos globales si son realmente globales.
4. Crear índices para `tenant_id`.
5. Crear índices para campos usados en login, como email.
6. Evitar borrado físico en tablas críticas.
7. Usar estados como `active`, `inactive`, `suspended`, `pending`.
8. Mantener timestamps.
9. Usar relaciones claras.
10. Evitar duplicidad de permisos.
11. Guardar tokens como hash, no en texto plano.
12. Diseñar pensando en auditoría y trazabilidad.

---

## 12. API Backend Esperada

Diseña endpoints REST para esta fase.

### Auth

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/me`

### Tenants

- `GET /tenants`
- `GET /tenants/:id`
- `POST /tenants`
- `PATCH /tenants/:id`
- `PATCH /tenants/:id/status`

### Users

- `GET /users`
- `GET /users/:id`
- `POST /users`
- `PATCH /users/:id`
- `PATCH /users/:id/status`
- `POST /users/:id/roles`
- `DELETE /users/:id/roles/:roleId`

### Roles

- `GET /roles`
- `GET /roles/:id`
- `POST /roles`
- `PATCH /roles/:id`
- `DELETE /roles/:id`
- `POST /roles/:id/permissions`
- `DELETE /roles/:id/permissions/:permissionId`

### Permissions

- `GET /permissions`
- `GET /permissions/grouped`

### Plans

- `GET /plans`
- `GET /plans/:id`
- `POST /plans`
- `PATCH /plans/:id`

### Subscriptions

- `GET /subscriptions`
- `GET /subscriptions/:id`
- `POST /subscriptions`
- `PATCH /subscriptions/:id`

### Settings

- `GET /settings`
- `PATCH /settings`

### Audit

- `GET /audit-logs`

### Menu

- `GET /menu/my-menu`

Cada endpoint debe considerar:

- Autenticación.
- Permisos.
- Tenant context.
- Validación de entrada.
- Paginación donde aplique.
- Filtros.
- Ordenamiento.
- Respuestas normalizadas.
- Errores controlados.

---

## 13. Seguridad Backend

Implementa o diseña:

### Guards

- JwtAuthGuard.
- RefreshTokenGuard.
- PermissionsGuard.
- TenantGuard si aplica.
- SuperAdminGuard si aplica.

### Decorators

- `@CurrentUser()`
- `@CurrentTenant()`
- `@RequirePermissions()`
- `@Public()`

### Interceptors

- Response interceptor.
- Audit interceptor para operaciones críticas.
- Tenant context interceptor si aplica.

### Pipes

- ValidationPipe global.
- Parse UUID/CUID pipe si aplica.

### Exception Filters

- Filtro global de errores.
- Errores de validación.
- Errores de autorización.
- Errores de tenant isolation.

---

## 14. Frontend Esperado

Diseña la base frontend con Angular.

### Pantallas mínimas

1. Login.
2. Recuperar contraseña.
3. Restablecer contraseña.
4. Dashboard inicial.
5. Perfil de usuario.
6. Administración de usuarios.
7. Administración de roles.
8. Administración de permisos.
9. Administración de empresa.
10. Administración de tenants, solo para superadmin.
11. Planes, solo para superadmin.
12. Suscripción del tenant.
13. Configuración general.
14. Auditoría.
15. Acceso denegado.
16. Página no encontrada.

### Componentes base

- Layout principal.
- Sidebar.
- Topbar.
- Breadcrumb.
- Tabla reutilizable.
- Formulario reutilizable cuando aplique.
- Confirm dialog.
- Loading spinner.
- Empty state.
- Error state.
- Toast / snackbar.
- Card de dashboard.
- Selector de tenant, solo si aplica para superadmin.

### Servicios frontend

- AuthService.
- TokenService.
- UserService.
- RoleService.
- PermissionService.
- TenantService.
- PlanService.
- SubscriptionService.
- SettingService.
- AuditService.
- MenuService.

### Guards frontend

- AuthGuard.
- PermissionGuard.
- GuestGuard.

### Interceptors frontend

- Auth token interceptor.
- Refresh token interceptor.
- Error interceptor.
- Loading interceptor si aplica.

---

## 15. Menú Dinámico

El menú debe generarse según permisos.

Ejemplo de estructura:

- Dashboard
- Administración
  - Empresa
  - Usuarios
  - Roles
  - Permisos
  - Configuración
- Plataforma
  - Tenants
  - Planes
  - Suscripciones
- Auditoría

Los módulos futuros deben poder agregarse al menú sin rediseñar toda la navegación.

Cada opción de menú debe tener:

- Código.
- Etiqueta.
- Ruta.
- Ícono.
- Permiso requerido.
- Orden.
- Estado activo/inactivo.
- Padre opcional.

---

## 16. Auditoría de la Fase 1

Auditar como mínimo:

- Login exitoso.
- Login fallido.
- Logout.
- Creación de tenant.
- Suspensión de tenant.
- Cambio de plan.
- Creación de usuario.
- Edición de usuario.
- Cambio de estado de usuario.
- Cambio de contraseña.
- Creación de rol.
- Cambio de permisos de rol.
- Asignación de roles a usuario.
- Cambios de configuración.
- Cambios de suscripción.

La auditoría debe registrar:

- Usuario.
- Tenant.
- Acción.
- Módulo.
- Entidad.
- ID de entidad.
- Valor anterior.
- Valor nuevo.
- Fecha.
- IP.
- User agent.

---

## 17. Estados Recomendados

### Tenant

- active
- suspended
- pending
- cancelled

### User

- active
- inactive
- pending
- locked

### Subscription

- trial
- active
- past_due
- cancelled
- expired

### Plan

- active
- inactive

---

## 18. Respuestas API Normalizadas

Propón una estructura uniforme de respuesta.

Ejemplo:

```json
{
  "success": true,
  "data": {},
  "message": "Operación realizada correctamente",
  "meta": {}
}
```

Para errores:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Datos inválidos",
    "details": []
  }
}
```

Los errores deben ser consistentes y no deben exponer información sensible.

---

## 19. Validaciones Críticas

Validar como mínimo:

- Email válido.
- Email único por tenant o según política definida.
- Contraseña segura.
- Usuario activo para login.
- Tenant activo para login.
- Plan activo para asignación.
- Permisos existentes.
- Roles existentes.
- No eliminar rol del sistema si está protegido.
- No suspender tenant sin permisos adecuados.
- No permitir modificar datos fuera del tenant.
- No permitir asignar permisos que el usuario no puede administrar.
- No permitir refresh token revocado.
- No permitir acceso con token vencido.

---

## 20. Consideraciones Multi-Tenant

Define claramente cómo se resuelve el tenant del usuario.

Opciones posibles:

1. Por usuario autenticado.
2. Por subdominio.
3. Por slug de empresa.
4. Por cabecera interna validada.
5. Por combinación de login y tenant.

Para la primera versión, se puede manejar el tenant asociado al usuario autenticado.

La arquitectura debe dejar abierta la posibilidad futura de usar subdominios:

`empresa.siscopnext.com`

La validación principal siempre debe ocurrir en el backend.

---

## 21. Estructura Backend Recomendada

Usa una estructura similar a:

```text
src/
  modules/
    auth/
      controllers/
      services/
      dto/
      guards/
      strategies/
    tenants/
      controllers/
      services/
      dto/
      repositories/
    users/
      controllers/
      services/
      dto/
      repositories/
    roles/
      controllers/
      services/
      dto/
      repositories/
    permissions/
      controllers/
      services/
      dto/
      repositories/
    plans/
      controllers/
      services/
      dto/
      repositories/
    subscriptions/
      controllers/
      services/
      dto/
      repositories/
    settings/
      controllers/
      services/
      dto/
      repositories/
    audit/
      controllers/
      services/
      dto/
      repositories/
    menu/
      controllers/
      services/
      dto/
      repositories/
  shared/
    database/
    security/
    errors/
    decorators/
    interceptors/
    filters/
    utils/
```

---

## 22. Estructura Frontend Recomendada

Usa una estructura similar a:

```text
src/
  app/
    core/
      auth/
      guards/
      interceptors/
      services/
      models/
    shared/
      components/
      pipes/
      directives/
      dialogs/
    layout/
      main-layout/
      sidebar/
      topbar/
      breadcrumb/
    features/
      auth/
      dashboard/
      users/
      roles/
      permissions/
      tenants/
      plans/
      subscriptions/
      settings/
      audit/
    app.routes.ts
```

---

## 23. Pruebas Requeridas

Diseña pruebas para:

### Backend

- Login correcto.
- Login con contraseña incorrecta.
- Login con usuario inactivo.
- Login con tenant suspendido.
- Refresh token válido.
- Refresh token revocado.
- Crear usuario.
- Asignar rol.
- Validar permiso.
- Rechazar acceso sin permiso.
- Rechazar acceso a otro tenant.
- Crear tenant.
- Suspender tenant.
- Auditar operación crítica.

### Frontend

- Login.
- Redirección de usuario no autenticado.
- Menú según permisos.
- Acceso denegado.
- CRUD de usuarios.
- CRUD de roles.
- Manejo de errores.
- Expiración de sesión.
- Renovación de token.

### Seguridad

- Intento de acceder a datos de otro tenant.
- Token vencido.
- Token alterado.
- Usuario sin permiso.
- Refresh token reutilizado luego de revocación.

---

## 24. Entregables de la Fase 1

La Fase 1 debe entregar:

1. Documento funcional de la Plataforma Base SaaS.
2. Diseño técnico de la Fase 1.
3. Modelo de datos Prisma/PostgreSQL.
4. Migraciones iniciales.
5. Backend NestJS base.
6. Frontend Angular base.
7. Autenticación funcional.
8. JWT + Refresh Token funcional.
9. Usuarios funcionales.
10. Roles funcionales.
11. Permisos funcionales.
12. Tenants funcionales.
13. Planes básicos.
14. Suscripciones básicas.
15. Configuración básica.
16. Auditoría básica.
17. Menú dinámico.
18. Dashboard inicial.
19. Documentación OpenAPI.
20. Pruebas principales.
21. Docker Compose para desarrollo.
22. Archivo `.env.example`.
23. Guía de instalación local.
24. Guía de despliegue inicial.

---

## 25. Criterios de Cierre

La Fase 1 se considera terminada cuando:

- Existe login funcional.
- Existe control de sesión con refresh token.
- Existen tenants.
- Existen usuarios por tenant.
- Existen roles configurables.
- Existen permisos granulares.
- El backend valida permisos.
- El frontend muestra menú según permisos.
- Se puede crear un tenant con usuario administrador inicial.
- Se puede suspender un tenant.
- Un tenant suspendido no puede operar.
- Existe auditoría de operaciones críticas.
- La API está documentada.
- Hay pruebas básicas funcionando.
- El sistema puede desplegarse en ambiente de desarrollo o staging.
- No existe fuga de datos entre tenants en pruebas básicas.
- La arquitectura queda lista para iniciar la Fase 2: Catálogos Maestros.

---

## 26. Forma Esperada de Respuesta del Agente

Cuando se use este prompt, el agente debe responder siguiendo esta estructura:

1. Resumen de la solución propuesta.
2. Alcance de la Fase 1.
3. Arquitectura backend.
4. Arquitectura frontend.
5. Modelo de base de datos.
6. Endpoints.
7. Pantallas.
8. Seguridad.
9. Multi-tenant.
10. Auditoría.
11. Pruebas.
12. Orden de implementación.
13. Riesgos.
14. Criterios de cierre.
15. Siguientes pasos.

Si se solicita código, el agente debe:

- Generar código compatible con NestJS, Angular, TypeScript, Prisma y PostgreSQL.
- Mantener estructura modular.
- Incluir validaciones.
- Considerar tenant_id.
- Considerar permisos.
- No omitir seguridad.
- No crear lógica industrial fuera de fase.
- No mezclar módulos futuros con esta fase.
- Explicar brevemente cómo se integra cada pieza.

---

## 27. Orden Recomendado de Implementación Interna

Implementa la Fase 1 en este orden:

1. Crear estructura de repositorio.
2. Configurar backend NestJS.
3. Configurar frontend Angular.
4. Configurar PostgreSQL y Prisma.
5. Crear modelo inicial de base de datos.
6. Crear migraciones.
7. Implementar módulo Auth.
8. Implementar JWT.
9. Implementar Refresh Tokens.
10. Implementar Tenants.
11. Implementar Users.
12. Implementar Roles.
13. Implementar Permissions.
14. Implementar Guards de permisos.
15. Implementar menú dinámico.
16. Implementar Plans.
17. Implementar Subscriptions.
18. Implementar Settings.
19. Implementar Audit Logs.
20. Crear pantallas Angular.
21. Crear pruebas.
22. Documentar API.
23. Crear Docker Compose.
24. Crear guía de instalación.
25. Validar criterios de cierre.

---

## 28. Riesgos Específicos de la Fase 1

### Riesgo 1: Seguridad multi-tenant débil

Mitigación:

- Validar tenant_id en backend.
- Centralizar contexto de tenant.
- Pruebas específicas de aislamiento.

### Riesgo 2: Permisos demasiado simples

Mitigación:

- Diseñar permisos granulares desde el inicio.
- Usar formato `modulo.accion`.

### Riesgo 3: Acoplar usuarios a lógica industrial

Mitigación:

- Mantener Fase 1 genérica como plataforma SaaS.

### Riesgo 4: Refresh tokens inseguros

Mitigación:

- Guardar hash del token.
- Permitir revocación.
- Registrar IP y user agent.
- Rotar tokens si se decide implementar mayor seguridad.

### Riesgo 5: Sobrediseñar pagos

Mitigación:

- Mantener planes y suscripciones básicos.
- No integrar pasarela de pago todavía salvo que se indique explícitamente.

### Riesgo 6: Menú rígido

Mitigación:

- Crear menú configurable y basado en permisos.

---

## 29. Resultado Final Esperado

Al finalizar la Fase 1, SISCOP NEXT debe tener una plataforma SaaS base funcional.

Debe ser posible:

- Crear un tenant.
- Crear usuarios dentro del tenant.
- Iniciar sesión.
- Gestionar roles.
- Gestionar permisos.
- Mostrar menú según permisos.
- Configurar datos básicos.
- Registrar auditoría.
- Bloquear tenants suspendidos.
- Proteger rutas y endpoints.
- Desplegar la aplicación en un ambiente controlado.

Esta fase no debe intentar resolver todavía el negocio industrial.

Su responsabilidad es construir la base segura, modular y escalable sobre la cual se implementarán las fases posteriores.

---

## 30. Instrucción Final

Usa este prompt exclusivamente para trabajar la Fase 1 — Plataforma Base SaaS.

No avances a Catálogos, Ingeniería, Cotizaciones, Producción, Inventario ni otros dominios industriales, excepto para dejar puntos de extensión correctamente preparados.

La prioridad es crear una plataforma SaaS sólida, segura, multi-tenant, auditable y preparada para crecer.

Si alguna decisión entra en conflicto con el Prompt Maestro de SISCOP NEXT, debe prevalecer el Prompt Maestro.
