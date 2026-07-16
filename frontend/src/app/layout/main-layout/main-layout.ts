import { Component, inject, signal, computed, effect } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar';
import { TopbarComponent } from '../topbar/topbar';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/auth/auth.service';
import { TenantService } from '../../core/services/tenant.service';
import { PaymentService } from '../../core/services/payment.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, CommonModule],
  templateUrl: './main-layout.html',
})
export class MainLayoutComponent {
  private themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private tenantService = inject(TenantService);
  private paymentService = inject(PaymentService);
  private router = inject(Router);

  sidebarActive = signal<boolean>(true);
  menuMode      = this.themeService.menuMode;

  // Subscription check
  currentUser = computed(() => this.authService.currentUser());
  isSubscriptionExpired = computed(() => this.currentUser()?.isSubscriptionExpired === true);

  plans = signal<any[]>([]);
  selectedPlanId = signal<string>('');
  selectedPlanIsFree = computed(() => {
    const pId = this.selectedPlanId();
    if (!pId) return false;
    const plan = this.plans().find(p => p.id === pId);
    return plan && plan.price == 0;
  });

  isLoadingPlans = signal<boolean>(false);
  isUpdatingPlan = signal<boolean>(false);
  isPaying = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Payment state
  showPaypalModal = signal<boolean>(false);
  paymentStatus = signal<{ success: boolean; message: string } | null>(null);

  selectedPlanPrice = computed(() => {
    const pId = this.selectedPlanId();
    if (!pId) return 0;
    return this.plans().find(p => p.id === pId)?.price || 0;
  });

  selectedPlanName = computed(() => {
    const pId = this.selectedPlanId();
    if (!pId) return '';
    return this.plans().find(p => p.id === pId)?.name || '';
  });

  constructor() {
    effect(() => {
      if (this.isSubscriptionExpired()) {
        this.loadPlans();
      }
    });
  }

  async loadPlans() {
    try {
      this.isLoadingPlans.set(true);
      const allPlans = await this.tenantService.getPlans();
      const user = this.currentUser();

      if (!user?.isDemoAvailable) {
        // Only show paid plans (exclude demo plan since it expired/used/unavailable)
        this.plans.set(allPlans.filter((p: any) => p.code !== 'demo'));
      } else {
        // Show all plans including the demo plan for new registrations
        this.plans.set(allPlans);
      }
      this.isLoadingPlans.set(false);
    } catch (err) {
      console.error('Error cargando planes para pantalla de expiración', err);
      this.isLoadingPlans.set(false);
    }
  }

  selectPlan(planId: string) {
    this.selectedPlanId.set(planId);
  }

  async confirmPlanUpgrade() {
    const user = this.currentUser();
    if (!user || !user.tenantId || !this.selectedPlanId()) return;

    try {
      this.isUpdatingPlan.set(true);
      this.errorMessage.set(null);
      this.successMessage.set(null);

      // Update tenant plan
      await this.tenantService.update(user.tenantId, { planId: this.selectedPlanId() });

      const isFree = this.selectedPlanIsFree();
      if (isFree) {
        this.successMessage.set('¡Plan Demo activado con éxito! Tu acceso ha sido restaurado.');
        await this.authService.loadCurrentUser();
      } else {
        this.successMessage.set('¡Plan seleccionado! Procede a realizar el pago para activar tu suscripción.');
        await this.authService.loadCurrentUser();
        this.openPaypalModal();
      }
    } catch (err: any) {
      this.errorMessage.set(err.error?.message || 'Error al actualizar el plan de suscripción.');
    } finally {
      this.isUpdatingPlan.set(false);
    }
  }

  openPaypalModal() {
    this.showPaypalModal.set(true);
    this.paymentStatus.set(null);
    // Use a slight timeout to let the modal render before looking for the container
    setTimeout(() => {
      this.loadPaypalSdk();
    }, 100);
  }

  closePaypalModal() {
    this.showPaypalModal.set(false);
  }

  async loadPaypalSdk() {
    if ((window as any).paypal) {
      this.renderPaypalButtons();
      return;
    }

    try {
      this.paymentStatus.set({ success: true, message: 'Cargando plataforma de pago seguro...' });
      const config = await this.paymentService.getPayPalConfig();
      const clientId = config.clientId || 'sb';
      
      // Si ya existe el script pero paypal no está listo, esperamos
      if (document.getElementById('paypal-sdk')) {
        this.renderPaypalButtons();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
      script.id = 'paypal-sdk';
      script.onload = () => {
        this.paymentStatus.set(null);
        this.renderPaypalButtons();
      };
      script.onerror = () => {
        console.warn('No se pudo cargar el SDK de PayPal.');
        this.paymentStatus.set({
          success: false,
          message: 'Error al cargar PayPal. Revisa tu conexión a internet o bloqueadores de anuncios (AdBlock).',
        });
      };
      document.body.appendChild(script);
    } catch (err: any) {
      console.error('Error cargando configuración de PayPal:', err);
      this.paymentStatus.set({
        success: false,
        message: 'No se pudo conectar con el servidor para iniciar el pago. ' + (err.message || ''),
      });
    }
  }

  async renderPaypalButtons() {
    let container = document.getElementById('paypal-button-container-layout');
    let retries = 0;
    
    // Esperar hasta 2 segundos para que el contenedor esté listo y paypal esté cargado
    while ((!container || !(window as any).paypal) && retries < 40) {
      await new Promise(r => setTimeout(r, 50));
      container = document.getElementById('paypal-button-container-layout');
      retries++;
    }

    if (!container) {
      console.error('Contenedor de PayPal no encontrado en el DOM después de esperar.');
      this.paymentStatus.set({ success: false, message: 'Error interno: No se pudo mostrar el botón de pago.' });
      return;
    }

    if (!(window as any).paypal) {
      console.error('El SDK de PayPal no cargó correctamente.');
      this.paymentStatus.set({ success: false, message: 'Error de red: PayPal no está disponible.' });
      return;
    }

    try {
      container.innerHTML = '';

    (window as any).paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'pay',
      },
      createOrder: (data: any, actions: any) => {
        const price = this.selectedPlanPrice();
        const planName = this.selectedPlanName();
        return actions.order.create({
          purchase_units: [
            {
              amount: {
                currency_code: 'USD',
                value: String(price),
              },
              description: `Suscripción Siscop - Plan ${planName}`,
            },
          ],
        });
      },
      onApprove: async (data: any, actions: any) => {
        this.isPaying.set(true);
        this.paymentStatus.set(null);
        try {
          // targetPlanId is not strictly needed since we updated the tenant plan already,
          // but if needed we can pass it. The backend uses the capture endpoint to register the payment.
          await this.paymentService.capturePayPal(data.orderID, this.selectedPlanId());
          this.paymentStatus.set({
            success: true,
            message: '¡Pago recibido con éxito! Tu suscripción se ha activado.',
          });
          // Reload user context to clear expired block
          await this.authService.loadCurrentUser();
          setTimeout(() => {
            this.showPaypalModal.set(false);
          }, 2000);
        } catch (err) {
          this.paymentStatus.set({
            success: false,
            message: 'Error al procesar el pago. Inténtalo de nuevo.',
          });
        } finally {
          this.isPaying.set(false);
        }
      },
      onError: (err: any) => {
        console.error('PayPal Button Error:', err);
        this.paymentStatus.set({
          success: false,
          message: 'Ocurrió un error con la pasarela de PayPal.',
        });
      }
    }).render('#paypal-button-container-layout');
    } catch (e: any) {
      console.error('Error instanciando botones de PayPal:', e);
      this.paymentStatus.set({ success: false, message: 'Error de la pasarela: ' + e.message });
    }
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }

  toggleSidebar() {
    this.sidebarActive.update(v => !v);
  }

  closeOverlay() {
    if (this.menuMode() === 'overlay') {
      this.sidebarActive.set(false);
    }
  }
}
