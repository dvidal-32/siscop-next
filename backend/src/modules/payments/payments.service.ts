import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private prisma: PrismaService) { }

  async findAll(tenantId: string) {
    return this.prisma.payment.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });
  }

  async getPayPalConfig() {
    const settings = await this.prisma.platformSetting.findMany({
      where: { key: { in: ['PAYPAL_SANDBOX_CLIENT_ID', 'PAYPAL_LIVE_CLIENT_ID', 'PAYPAL_MODE'] } }
    });

    const mode = settings.find(s => s.key === 'PAYPAL_MODE')?.value || 'sandbox';
    let dbClientId = '';

    if (mode === 'live') {
      dbClientId = settings.find(s => s.key === 'PAYPAL_LIVE_CLIENT_ID')?.value || '';
    } else {
      dbClientId = settings.find(s => s.key === 'PAYPAL_SANDBOX_CLIENT_ID')?.value || '';
    }

    return {
      clientId: dbClientId || process.env.PAYPAL_CLIENT_ID || 'sb',
      mode: mode
    };
  }

  async getSubscriptionInfo(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        plan: true,
        subscriptions: {
          where: { status: 'active' },
          orderBy: { end_date: 'desc' },
          take: 1,
        },
      },
    });

    if (!tenant) {
      throw new HttpException('Tenant no encontrado', HttpStatus.NOT_FOUND);
    }

    const activeSub = tenant.subscriptions[0] || null;

    return {
      planName: tenant.plan.name,
      planPrice: tenant.plan.price,
      billingCycle: tenant.plan.billing_cycle,
      subscriptionStatus: activeSub ? activeSub.status : 'inactive',
      startDate: activeSub ? activeSub.start_date : null,
      endDate: activeSub ? activeSub.end_date : null,
      tenantName: tenant.name,
    };
  }

  async capturePayPalPayment(orderId: string, tenantId: string, userId: string, targetPlanId?: string) {
    const settings = await this.prisma.platformSetting.findMany({
      where: { key: { in: ['PAYPAL_SANDBOX_CLIENT_ID', 'PAYPAL_SANDBOX_CLIENT_SECRET', 'PAYPAL_LIVE_CLIENT_ID', 'PAYPAL_LIVE_CLIENT_SECRET', 'PAYPAL_MODE'] } }
    });

    const dbPaypalMode = settings.find(s => s.key === 'PAYPAL_MODE')?.value || 'sandbox';
    const isLive = dbPaypalMode === 'live';

    let dbClientId = '';
    let dbClientSecret = '';

    if (isLive) {
      dbClientId = settings.find(s => s.key === 'PAYPAL_LIVE_CLIENT_ID')?.value || '';
      dbClientSecret = settings.find(s => s.key === 'PAYPAL_LIVE_CLIENT_SECRET')?.value || '';
    } else {
      dbClientId = settings.find(s => s.key === 'PAYPAL_SANDBOX_CLIENT_ID')?.value || '';
      dbClientSecret = settings.find(s => s.key === 'PAYPAL_SANDBOX_CLIENT_SECRET')?.value || '';
    }

    const clientId = dbClientId || process.env.PAYPAL_CLIENT_ID;
    const clientSecret = dbClientSecret || process.env.PAYPAL_CLIENT_SECRET;
    const baseUrl = isLive ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

    // Fetch Tenant to know Plan price
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: true },
    });

    if (!tenant) {
      throw new HttpException('Tenant no encontrado', HttpStatus.NOT_FOUND);
    }

    let planToActivate = tenant.plan;
    if (targetPlanId) {
      const targetPlan = await this.prisma.plan.findUnique({ where: { id: targetPlanId } });
      if (targetPlan) {
        planToActivate = targetPlan as any;
      }
    }

    const amount = planToActivate.price;

    let transactionDetails = {
      payerEmail: 'paypal-sandbox-buyer@example.com',
      payerName: 'Sandbox Buyer',
      status: 'completed',
      transactionId: orderId,
    };

    if (clientId && clientSecret && !orderId.startsWith('PAY-MOCK-')) {
      // ────────────────────────────────────────────────────────────────
      // REAL PAYPAL API CALL (SANDBOX/LIVE)
      // ────────────────────────────────────────────────────────────────
      this.logger.log(`Procesando pago PayPal real para orden: ${orderId}`);
      try {
        // 1. Obtener Token de Acceso
        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'grant_type=client_credentials',
        });

        if (!tokenResponse.ok) {
          const errText = await tokenResponse.text();
          this.logger.error(`Error Auth PayPal: ${errText}`);
          throw new Error('Fallo al autenticar con PayPal API');
        }

        const tokenData: any = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // 2. Capturar Orden
        const captureResponse = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });

        if (!captureResponse.ok) {
          const errText = await captureResponse.text();
          this.logger.error(`Error Capture PayPal: ${errText}`);
          throw new Error('Fallo al capturar la orden en PayPal API');
        }

        const captureData: any = await captureResponse.json();

        // 3. Extraer detalles
        const payer = captureData.payer || {};
        transactionDetails.payerEmail = payer.email_address || transactionDetails.payerEmail;
        transactionDetails.payerName = `${payer.name?.given_name || ''} ${payer.name?.surname || ''}`.trim() || transactionDetails.payerName;
        transactionDetails.status = captureData.status === 'COMPLETED' ? 'completed' : 'failed';

        // Obtener ID de la captura real si existe
        const captureId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id;
        if (captureId) {
          transactionDetails.transactionId = captureId;
        }

        if (transactionDetails.status !== 'completed') {
          throw new HttpException('La transacción de PayPal no se completó', HttpStatus.BAD_REQUEST);
        }

      } catch (err) {
        this.logger.error('Error al comunicarse con PayPal:', err);
        throw new HttpException(
          `Error en pasarela PayPal: ${err.message}`,
          HttpStatus.BAD_GATEWAY,
        );
      }
    } else {
      // ────────────────────────────────────────────────────────────────
      // MOCK PAYPAL FLOW (DEVELOPMENT FALLBACK O SIMULADOR)
      // ────────────────────────────────────────────────────────────────
      this.logger.warn(
        `Ejecutando captura simulada (Mock Mode) para la transacción: ${orderId}. (Credenciales no configuradas o es un pago de prueba)`,
      );
      // Simular latencia de red
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    // ────────────────────────────────────────────────────────────────
    // TRANSACCIÓN DE BASE DE DATOS: RENOVAR SUSCRIPCIÓN Y REGISTRAR PAGO
    // ────────────────────────────────────────────────────────────────
    return this.prisma.$transaction(async (tx) => {
      // Registrar Pago
      const payment = await tx.payment.create({
        data: {
          tenant_id: tenantId,
          amount: amount,
          currency: 'USD',
          status: transactionDetails.status,
          gateway: clientId && clientSecret ? 'paypal' : 'mock_paypal',
          transaction_id: transactionDetails.transactionId,
          payer_email: transactionDetails.payerEmail,
          payer_name: transactionDetails.payerName,
        },
      });

      if (transactionDetails.status === 'completed') {
        if (targetPlanId && targetPlanId !== tenant.plan_id) {
          await tx.tenant.update({
            where: { id: tenantId },
            data: { plan_id: targetPlanId },
          });
        }

        // Encontrar suscripción activa del Tenant
        const activeSub = await tx.subscription.findFirst({
          where: { tenant_id: tenantId, status: 'active' },
          include: { plan: true },
        });

        const now = new Date();
        let newEndDate = new Date();

        const isUpgradeFromDemo = activeSub && activeSub.plan?.code === 'demo';

        if (activeSub && activeSub.end_date > now && !isUpgradeFromDemo) {
          // Extender desde la fecha actual de finalización
          newEndDate = new Date(activeSub.end_date);
          newEndDate.setDate(newEndDate.getDate() + 30);
        } else {
          // Renovar o iniciar a partir de hoy
          newEndDate.setDate(now.getDate() + 30);
        }

        if (activeSub) {
          if (isUpgradeFromDemo) {
            // Dar por terminada la suscripción demo de inmediato
            await tx.subscription.update({
              where: { id: activeSub.id },
              data: {
                status: 'expired',
                end_date: now,
              },
            });

            // Crear la nueva suscripción de pago activa hoy
            await tx.subscription.create({
              data: {
                tenant_id: tenantId,
                plan_id: targetPlanId || tenant.plan_id,
                status: 'active',
                start_date: now,
                end_date: newEndDate,
              },
            });
          } else {
            // Actualizar la suscripción de pago activa existente (extensión/renovación)
            await tx.subscription.update({
              where: { id: activeSub.id },
              data: {
                end_date: newEndDate,
                status: 'active',
                plan_id: targetPlanId || tenant.plan_id,
              },
            });
          }
        } else {
          // Crear una nueva suscripción de pago
          await tx.subscription.create({
            data: {
              tenant_id: tenantId,
              plan_id: targetPlanId || tenant.plan_id,
              status: 'active',
              start_date: now,
              end_date: newEndDate,
            },
          });
        }
      }

      return payment;
    });
  }
}
