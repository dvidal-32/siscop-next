import { Component, inject, signal, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../../core/services/payment.service';
import { TableModule } from 'primeng/table';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule],
  templateUrl: './billing.html',
})
export class BillingComponent implements OnInit, AfterViewInit {
  private paymentService = inject(PaymentService);

  payments = signal<any[]>([]);
  subInfo = signal<any | null>(null);
  isLoading = signal<boolean>(false);
  isProcessing = signal<boolean>(false);
  
  // Custom Simulator state
  showSimulator = signal<boolean>(false);
  simulatorOrderId = signal<string>('');
  paymentStatus = signal<{ success: boolean; message: string } | null>(null);

  async ngOnInit() {
    this.isLoading.set(true);
    await this.loadData();
    this.isLoading.set(false);
  }

  ngAfterViewInit() {
    this.loadPaypalSdk();
  }

  async loadData() {
    try {
      const [sub, history] = await Promise.all([
        this.paymentService.getSubscription(),
        this.paymentService.findAll(),
      ]);
      this.subInfo.set(sub);
      this.payments.set(history);
    } catch (err) {
      console.error('Error cargando información de facturación:', err);
    }
  }

  async loadPaypalSdk() {
    // Check if PayPal is already loaded
    if ((window as any).paypal) {
      this.renderPaypalButtons();
      return;
    }

    try {
      const config = await this.paymentService.getPayPalConfig();
      const clientId = config.clientId || 'sb';
      
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
      script.id = 'paypal-sdk';
      script.onload = () => {
        this.renderPaypalButtons();
      };
      script.onerror = () => {
        console.warn('No se pudo cargar el SDK de PayPal (puede deberse a bloqueadores de publicidad o falta de conexión). Se usará el simulador.');
      };
      document.body.appendChild(script);
    } catch (err) {
      console.error('Error cargando configuración de PayPal:', err);
    }
  }

  renderPaypalButtons() {
    const container = document.getElementById('paypal-button-container');
    if (!container || !(window as any).paypal) return;

    // Clear previous button content if any
    container.innerHTML = '';

    (window as any).paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'pay',
      },
      createOrder: (data: any, actions: any) => {
        const price = this.subInfo()?.planPrice || '29.99';
        return actions.order.create({
          purchase_units: [
            {
              amount: {
                currency_code: 'USD',
                value: String(price),
              },
              description: `Renovación de Suscripción Siscop - Plan ${this.subInfo()?.planName || 'Pro'}`,
            },
          ],
        });
      },
      onApprove: async (data: any, actions: any) => {
        this.isProcessing.set(true);
        this.paymentStatus.set(null);
        try {
          await this.paymentService.capturePayPal(data.orderID);
          this.paymentStatus.set({
            success: true,
            message: '¡Pago recibido con éxito a través de PayPal! Tu suscripción ha sido extendida 30 días.',
          });
          await this.loadData();
        } catch (err) {
          this.paymentStatus.set({
            success: false,
            message: 'Error al procesar la captura de PayPal en el servidor. Inténtalo de nuevo.',
          });
        } finally {
          this.isProcessing.set(false);
        }
      },
      onError: (err: any) => {
        console.error('PayPal Button Error:', err);
        this.paymentStatus.set({
          success: false,
          message: 'Ocurrió un error con la pasarela de PayPal. Puedes usar el Simulador de Facturación para pruebas.',
        });
      }
    }).render('#paypal-button-container');
  }

  openSimulator() {
    // Generate a mock PayPal order ID
    const randomHex = Math.random().toString(36).substring(2, 11).toUpperCase();
    this.simulatorOrderId.set(`PAY-MOCK-${randomHex}`);
    this.showSimulator.set(true);
    this.paymentStatus.set(null);
  }

  closeSimulator() {
    this.showSimulator.set(false);
  }

  async runSimulation() {
    this.isProcessing.set(true);
    this.paymentStatus.set(null);
    try {
      await this.paymentService.capturePayPal(this.simulatorOrderId());
      this.paymentStatus.set({
        success: true,
        message: '¡Pago simulado procesado con éxito! Se ha registrado el pago mock y la suscripción se extendió 30 días.',
      });
      await this.loadData();
      this.showSimulator.set(false);
    } catch (err) {
      this.paymentStatus.set({
        success: false,
        message: 'Error al procesar el pago simulado.',
      });
    } finally {
      this.isProcessing.set(false);
    }
  }

  clearStatus() {
    this.paymentStatus.set(null);
  }
}
