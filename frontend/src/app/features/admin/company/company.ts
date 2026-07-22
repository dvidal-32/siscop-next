import { Component, inject, signal, computed, OnInit, isDevMode } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TenantService } from '../../../core/services/tenant.service';
import { AuthService } from '../../../core/auth/auth.service';
import { PaymentService } from '../../../core/services/payment.service';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';

export const SETTINGS_SCHEMA = {
  // Ingeniería y Producción
  'LARGO_BARRA_STAND': { category: 'Ingeniería y Producción', label: 'Largo Estándar de Barra', type: 'number', suffix: 'm' },
  'MERMA_ALUMINIO': { category: 'Ingeniería y Producción', label: 'Merma de Aluminio', type: 'number', suffix: '%' },
  'MERMA_VIDRIO': { category: 'Ingeniería y Producción', label: 'Merma de Vidrio', type: 'number', suffix: '%' },
  'MERMA_ACCESORIOS': { category: 'Ingeniería y Producción', label: 'Merma de Accesorios', type: 'number', suffix: '%' },

  // Costos Operativos y Mano de Obra
  'COSTO_HORA_FABRICACION': { category: 'Costos Operativos y Mano de Obra', label: 'Costo Hora Fabricación', type: 'currency' },
  'COSTO_HORA_INSTALACION': { category: 'Costos Operativos y Mano de Obra', label: 'Costo Hora Instalación', type: 'currency' },
  'COSTO_FLETE_KM': { category: 'Costos Operativos y Mano de Obra', label: 'Costo Flete por Km', type: 'currency' },
  'FACTOR_DIFICULTAD_ALTURA': { category: 'Costos Operativos y Mano de Obra', label: 'Factor Dificultad Altura', type: 'number', suffix: 'x' },

  // Márgenes de Utilidad (Comercial)
  'MARGEN_UTILIDAD_ALUMINIO': { category: 'Márgenes de Utilidad (Comercial)', label: 'Margen Aluminio', type: 'number', suffix: '%' },
  'MARGEN_UTILIDAD_VIDRIO': { category: 'Márgenes de Utilidad (Comercial)', label: 'Margen Vidrio', type: 'number', suffix: '%' },
  'MARGEN_UTILIDAD_HERRAJES': { category: 'Márgenes de Utilidad (Comercial)', label: 'Margen Herrajes', type: 'number', suffix: '%' },
  'MARGEN_GASTOS_INDIRECTOS': { category: 'Márgenes de Utilidad (Comercial)', label: 'Margen Gastos Indirectos', type: 'number', suffix: '%' },

  // Cotizaciones y Formatos
  'COTIZACION_CONDICIONES': { category: 'Cotizaciones y Formatos', label: 'Condiciones Comerciales', type: 'textarea' },
  'COTIZACION_NOTAS': { category: 'Cotizaciones y Formatos', label: 'Notas Adicionales', type: 'textarea' },

  // Listas de Precios
  'price_name_1': { category: 'Listas de Precios', label: 'Nombre Lista 1 (Def: Precio 1)', type: 'string' },
  'price_name_2': { category: 'Listas de Precios', label: 'Nombre Lista 2 (Def: Precio 2)', type: 'string' },
  'price_name_3': { category: 'Listas de Precios', label: 'Nombre Lista 3 (Def: Precio 3)', type: 'string' },
  'price_name_4': { category: 'Listas de Precios', label: 'Nombre Lista 4 (Def: Precio 4)', type: 'string' },
};

export const COUNTRIES_LIST = [
  { name: 'República Dominicana', code: 'DOP', symbol: 'RD$', locale: 'es-DO' },
  { name: 'México', code: 'MXN', symbol: '$', locale: 'es-MX' },
  { name: 'Chile', code: 'CLP', symbol: '$', locale: 'es-CL' },
  { name: 'Colombia', code: 'COP', symbol: '$', locale: 'es-CO' },
  { name: 'Perú', code: 'PEN', symbol: 'S/', locale: 'es-PE' },
  { name: 'España', code: 'EUR', symbol: '€', locale: 'es-ES' },
  { name: 'Estados Unidos', code: 'USD', symbol: '$', locale: 'en-US' },
  { name: 'Argentina', code: 'ARS', symbol: '$', locale: 'es-AR' },
  { name: 'Ecuador', code: 'USD', symbol: '$', locale: 'es-EC' },
  { name: 'Panamá', code: 'PAB', symbol: 'B/.', locale: 'es-PA' },
  { name: 'Costa Rica', code: 'CRC', symbol: '₡', locale: 'es-CR' },
];

@Component({
  selector: 'app-company',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, ButtonModule, TableModule],
  templateUrl: './company.html',
})
export class CompanyComponent implements OnInit {
  private fb = inject(FormBuilder);
  private tenantService = inject(TenantService);
  public authService = inject(AuthService);
  private paymentService = inject(PaymentService);
  private router = inject(Router);

  public isDevMode = isDevMode();

  get isAdmin(): boolean {
    const user = this.authService.currentUser();
    if (!user || !user.roles) return false;
    return user.roles.some((r: any) => r.name === 'Administrador' || r.isSystemRole);
  }

  get canDeleteAccount(): boolean {
    const user = this.authService.currentUser();
    if (!user || !user.roles) return false;
    
    // El rol "Super Administrador" es el rol global del sistema. 
    const isSuperAdmin = user.roles.some((r: any) => r.name === 'Super Administrador');
    const isTenantAdmin = user.roles.some((r: any) => r.name === 'Administrador');
    
    // Solo Admin regular puede eliminar la cuenta, bloqueando a Super Admins y suplantaciones.
    return isTenantAdmin && !isSuperAdmin && !user.isImpersonating;
  }

  activeTab = signal<'general' | 'settings' | 'plans' | 'taxes' | 'billing'>('general');
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Billing states
  currencySymbol = computed(() => {
    const symbolSetting = this.tenantService.tenantSettings().find((s: any) => s.key === 'MONEDA_SIMBOLO');
    return symbolSetting?.value || '$';
  });

  // Local form state for currency config in General tab
  countriesList = COUNTRIES_LIST;
  formCurrencyCode = signal<string>('USD');
  formCurrencySymbol = signal<string>('$');
  formCurrencyLocale = signal<string>('en-US');

  onCountryChange(event: any) {
    const countryName = event.target.value;
    const countryObj = this.countriesList.find(c => c.name === countryName);
    if (countryObj) {
      this.formCurrencyCode.set(countryObj.code);
      this.formCurrencySymbol.set(countryObj.symbol);
      this.formCurrencyLocale.set(countryObj.locale);
    }
  }

  payments = signal<any[]>([]);
  subInfo = signal<any | null>(null);
  isProcessing = signal<boolean>(false);
  showSimulator = signal<boolean>(false);
  simulatorOrderId = signal<string>('');
  paymentStatus = signal<{ success: boolean; message: string } | null>(null);
  pendingPlan = signal<any | null>(null);

  tenantForm = this.fb.group({
    name: ['', [Validators.required]],
    legalName: [''],
    taxId: [''],
    email: ['', [Validators.email]],
    phone: [''],
    logo: [''],
    country: [''],
    city: [''],
    municipality: [''],
    street: [''],
    number: [''],
    postalCode: [''],
    whatsapp: [''],
    planId: [''],
  });

  taxesList = signal<any[]>([]);
  showTaxModal = signal<boolean>(false);
  selectedTax = signal<any | null>(null);

  taxForm = this.fb.group({
    name: ['', [Validators.required]],
    rate: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    isActive: [true],
    isDefault: [false],
  });

  // Delete Account State
  showDeleteModal = signal<boolean>(false);
  deletePassword = signal<string>('');
  isDeleting = signal<boolean>(false);
  deleteError = signal<string | null>(null);

  plans = signal<any[]>([]);
  initialPlanId = signal<string>('');
  initialPlanCode = signal<string>('');

  settingsList = signal<any[]>([]);

  async ngOnInit() {
    this.isLoading.set(true);
    await this.loadData();
    this.isLoading.set(false);
  }

  async loadData() {
    try {
      const user = this.authService.currentUser();
      if (!user?.tenantId) return;

      // 1. Fetch Tenant details
      const tenantData = await this.tenantService.get(user.tenantId);
      if (tenantData) {
        this.initialPlanId.set(tenantData.plan_id || '');
        this.initialPlanCode.set(tenantData.plan?.code || '');
        this.tenantForm.patchValue({
          name: tenantData.name,
          legalName: tenantData.legal_name,
          taxId: tenantData.tax_id,
          email: tenantData.email,
          phone: tenantData.phone,
          logo: tenantData.logo || '',
          country: tenantData.country || '',
          city: tenantData.city || '',
          municipality: tenantData.municipality || '',
          street: tenantData.street || '',
          number: tenantData.number || '',
          postalCode: tenantData.postal_code || '',
          whatsapp: tenantData.whatsapp || '',
          planId: tenantData.plan_id,
        });
      }

      // 2. Fetch Settings
      const settingsData = await this.tenantService.getSettings();
      const list = settingsData.map((s) => ({
        key: s.key,
        value: s.value,
        valueType: s.value_type,
      }));

      // Auto-fill missing settings from schema
      const existingKeys = new Set(list.map(s => s.key));
      Object.keys(SETTINGS_SCHEMA).forEach(key => {
        if (!existingKeys.has(key)) {
          let defaultVal = '';
          if (key === 'price_name_1') defaultVal = 'Precio 1';
          if (key === 'price_name_2') defaultVal = 'Precio 2';
          if (key === 'price_name_3') defaultVal = 'Precio 3';
          if (key === 'price_name_4') defaultVal = 'Precio 4';
          if (key === 'COTIZACION_CONDICIONES') defaultVal = 'Condiciones estándar...';
          
          list.push({ key, value: defaultVal, valueType: (SETTINGS_SCHEMA as any)[key].type === 'number' ? 'number' : 'string' });
        }
      });

      this.settingsList.set(list);

      // Load form currency signals
      const code = settingsData.find(s => s.key === 'MONEDA_CODIGO')?.value || 'USD';
      this.formCurrencyCode.set(code);
      const sym = settingsData.find(s => s.key === 'MONEDA_SIMBOLO')?.value || '$';
      this.formCurrencySymbol.set(sym);
      const loc = settingsData.find(s => s.key === 'MONEDA_LOCALE')?.value || 'en-US';
      this.formCurrencyLocale.set(loc);

      // 3. Fetch Available Plans
      const plansData = await this.tenantService.getPlans();
      if (!user?.isDemoAvailable) {
        this.plans.set(plansData.filter((p: any) => p.code !== 'demo'));
      } else {
        this.plans.set(plansData);
      }

      // 4. Fetch Taxes
      const taxesData = await this.tenantService.getTaxes();
      this.taxesList.set(taxesData);

      // 5. Fetch Billing/Invoices data
      await this.loadBillingData();
    } catch (err) {
      console.error('Error cargando datos de empresa', err);
    }
  }

  async saveGeneral() {
    if (this.tenantForm.invalid) {
      this.tenantForm.markAllAsTouched();
      this.errorMessage.set('Por favor, completa todos los campos requeridos marcados en rojo.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const user = this.authService.currentUser();
    const isPlanChange = this.activeTab() === 'plans';
    const selectedPlanId = this.getSelectedPlanId();
    const selectedPlan = this.plans().find(p => p.id === selectedPlanId);
    const isFree = selectedPlan && selectedPlan.price == 0;

    if (isPlanChange && selectedPlanId === this.initialPlanId()) {
      this.errorMessage.set('Ya tienes este plan de suscripción seleccionado actualmente como tu plan activo.');
      this.isLoading.set(false);
      return;
    }

    const payload = { ...this.tenantForm.value };
    
    // Si no es un plan gratuito, NUNCA enviamos el planId al backend
    // El plan solo debe actualizarse cuando el pago se procese correctamente en el backend.
    if (!isFree) {
       delete payload.planId;
    }

    try {
      await this.tenantService.update(user.tenantId, payload);

      // Update currency settings
      this.updateSettingByKey('MONEDA_CODIGO', this.formCurrencyCode());
      this.updateSettingByKey('MONEDA_SIMBOLO', this.formCurrencySymbol());
      this.updateSettingByKey('MONEDA_LOCALE', this.formCurrencyLocale());

      // Filter out rows with empty keys
      const settingsPayload = this.settingsList().filter((s) => s.key.trim() !== '');
      await this.tenantService.updateSettings(settingsPayload);
      
      if (isPlanChange) {
        const selectedPlan = this.plans().find(p => p.id === selectedPlanId);
        const isFree = selectedPlan && selectedPlan.price == 0;

        if (isFree) {
          this.successMessage.set(
            '¡Plan Demo activado con éxito! Se ha activado tu período de prueba gratuito de 30 días.'
          );
          await this.authService.loadCurrentUser(); // Reload session context
          this.initialPlanId.set(selectedPlanId);
          this.isLoading.set(false);
        } else {
          this.successMessage.set(
            'Redirigiendo a facturación para procesar el pago del nuevo plan...'
          );
          setTimeout(() => {
            this.setTab('billing');
          }, 2000);
        }
      } else {
        this.successMessage.set('Datos generales actualizados con éxito.');
        await this.authService.loadCurrentUser(); // Reload session context
      }
    } catch (err: any) {
      this.errorMessage.set(err.error?.message || 'Error al actualizar datos.');
      this.isLoading.set(false);
    } finally {
      const selectedPlan = this.plans().find(p => p.id === selectedPlanId);
      const isFree = selectedPlan && selectedPlan.price == 0;
      if (!isPlanChange || isFree) {
        this.isLoading.set(false);
      }
    }
  }

  loadDefaultSettings() {
    const defaults = [
      { key: 'MERMA_ALUMINIO', value: '8.0', valueType: 'number' },
      { key: 'MERMA_VIDRIO', value: '5.0', valueType: 'number' },
      { key: 'MERMA_ACCESORIOS', value: '2.0', valueType: 'number' },
      { key: 'COSTO_HORA_FABRICACION', value: '15.00', valueType: 'number' },
      { key: 'COSTO_HORA_INSTALACION', value: '18.00', valueType: 'number' },
      { key: 'FACTOR_DIFICULTAD_ALTURA', value: '1.20', valueType: 'number' },
      { key: 'MARGEN_UTILIDAD_ALUMINIO', value: '1.40', valueType: 'number' },
      { key: 'MARGEN_UTILIDAD_VIDRIO', value: '1.50', valueType: 'number' },
      { key: 'MARGEN_UTILIDAD_HERRAJES', value: '1.30', valueType: 'number' },
      { key: 'MARGEN_GASTOS_INDIRECTOS', value: '1.15', valueType: 'number' },
      { key: 'MONEDA_SIMBOLO', value: '$', valueType: 'string' },
      { key: 'MONEDA_CODIGO', value: 'USD', valueType: 'string' },
      { key: 'LARGO_BARRA_STAND', value: '6.10', valueType: 'number' },
      { key: 'COSTO_FLETE_KM', value: '1.50', valueType: 'number' },
      { key: 'COTIZACION_CONDICIONES', value: '• Pago: 45 dias\n• Validez: Esta cotización es válida por 15 dias a partir de la fecha de emisión.\n• Los precios mostrados incluyen todos los materiales y labor necesarios.', valueType: 'string' },
      { key: 'COTIZACION_NOTAS', value: 'Cualquier modificación al diseño original o medidas después de aprobada esta cotización podría generar costos adicionales y cambios en los tiempos de entrega.', valueType: 'string' }
    ];

    this.settingsList.set(defaults);
  }

  groupedSettings = computed(() => {
    const groups: { [category: string]: any[] } = {};
    const custom: any[] = [];
    const list = this.settingsList();

    // Initialize all schema categories to maintain order
    const categories = [
      'Ingeniería y Producción',
      'Costos Operativos y Mano de Obra',
      'Márgenes de Utilidad (Comercial)',
      'Cotizaciones y Formatos',
      'Listas de Precios',
      'General y Regional'
    ];
    categories.forEach(cat => groups[cat] = []);

    list.forEach((setting, originalIndex) => {
      const schemaDef = (SETTINGS_SCHEMA as any)[setting.key];
      const itemWithMeta = { ...setting, originalIndex, schema: schemaDef };
      
      if (schemaDef) {
        groups[schemaDef.category].push(itemWithMeta);
      } else {
        custom.push(itemWithMeta);
      }
    });

    return { groups, custom };
  });

  updateSettingValue(index: number, val: string) {
    this.settingsList.update((list) => {
      list[index].value = val;
      return [...list];
    });
  }

  updateSettingByKey(key: string, value: string) {
    this.settingsList.update((list) => {
      const item = list.find(s => s.key === key);
      if (item) {
        item.value = value;
      } else {
        list.push({ key, value, valueType: 'string' });
      }
      return [...list];
    });
  }

  updateSettingKey(index: number, key: string) {
    this.settingsList.update((list) => {
      list[index].key = key;
      return [...list];
    });
  }

  addSetting() {
    this.settingsList.update((list) => [
      ...list,
      { key: '', value: '', valueType: 'string' },
    ]);
  }

  removeSetting(index: number) {
    this.settingsList.update((list) => list.filter((_, i) => i !== index));
  }

  async saveSettings() {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    // Filter out rows with empty keys
    const payload = this.settingsList().filter((s) => s.key.trim() !== '');

    try {
      await this.tenantService.updateSettings(payload);
      this.successMessage.set('Parámetros de configuración guardados con éxito.');
      await this.loadData();
    } catch (err: any) {
      this.errorMessage.set(err.error?.message || 'Error al guardar configuraciones.');
    } finally {
      this.isLoading.set(false);
    }
  }

  selectPlan(planId: string) {
    const selectedPlan = this.plans().find(p => p.id === planId);

    const isCurrentDemo = this.initialPlanCode() === 'demo';
    const isSelectedPaid = selectedPlan && selectedPlan.price > 0 && selectedPlan.code !== 'demo';

    if (isCurrentDemo && isSelectedPaid) {
      const confirmChange = confirm(
        `¡Atención!\n\nAl cambiar al plan de pago "${selectedPlan.name}", tu período de prueba actual (DEMO) finalizará de inmediato.\n\nLos días restantes de la demo se sustituirán por el período de vigencia del nuevo plan y no se acumularán. ¿Deseas continuar?`
      );
      if (!confirmChange) {
        return; // Cancelar la selección del plan
      }
    }

    this.tenantForm.patchValue({ planId });
  }

  getSelectedPlanId(): string {
    return this.tenantForm.get('planId')?.value || '';
  }

  setTab(tab: 'general' | 'settings' | 'plans' | 'taxes' | 'billing') {
    this.activeTab.set(tab);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    if (tab === 'billing') {
      const selectedPlanId = this.tenantForm.get('planId')?.value;
      if (selectedPlanId && selectedPlanId !== this.initialPlanId()) {
        const selectedPlan = this.plans().find(p => p.id === selectedPlanId);
        this.pendingPlan.set(selectedPlan || null);
      } else {
        this.pendingPlan.set(null);
      }

      setTimeout(() => {
        this.loadPaypalSdk();
      }, 100);
    }
  }

  onLogoChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Limit to 500KB (512,000 bytes)
      if (file.size > 512000) {
        this.errorMessage.set('El tamaño de la imagen del logo no debe exceder los 500 KB.');
        input.value = ''; // Reset file input
        return;
      }

      this.errorMessage.set(null);
      const reader = new FileReader();
      reader.onload = () => {
        this.tenantForm.patchValue({
          logo: reader.result as string
        });
      };
      reader.onerror = () => {
        this.errorMessage.set('Ocurrió un error al leer el archivo de la imagen.');
      };
      reader.readAsDataURL(file);
    }
  }

  removeLogo() {
    this.tenantForm.patchValue({
      logo: ''
    });
  }

  openCreateTax() {
    this.selectedTax.set(null);
    this.taxForm.reset({
      name: '',
      rate: 0,
      isActive: true,
      isDefault: false,
    });
    this.showTaxModal.set(true);
  }

  openEditTax(tax: any) {
    this.selectedTax.set(tax);
    this.taxForm.patchValue({
      name: tax.name,
      rate: Number(tax.rate),
      isActive: tax.is_active,
      isDefault: tax.is_default,
    });
    this.showTaxModal.set(true);
  }

  closeTaxModal() {
    this.showTaxModal.set(false);
    this.selectedTax.set(null);
  }

  async saveTax() {
    if (this.taxForm.invalid) {
      this.taxForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const data = this.taxForm.value;
      if (this.selectedTax()) {
        await this.tenantService.updateTax(this.selectedTax().id, data);
        this.successMessage.set('Impuesto actualizado con éxito.');
      } else {
        await this.tenantService.createTax(data);
        this.successMessage.set('Impuesto creado con éxito.');
      }
      this.showTaxModal.set(false);
      // Reload taxes
      const taxesData = await this.tenantService.getTaxes();
      this.taxesList.set(taxesData);
    } catch (err: any) {
      this.errorMessage.set(err.error?.message || 'Error al guardar el impuesto.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteTax(id: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar este impuesto?')) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      await this.tenantService.deleteTax(id);
      this.successMessage.set('Impuesto eliminado con éxito.');
      // Reload taxes
      const taxesData = await this.tenantService.getTaxes();
      this.taxesList.set(taxesData);
    } catch (err: any) {
      this.errorMessage.set(err.error?.message || 'Error al eliminar el impuesto.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadBillingData() {
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

    container.innerHTML = '';

    (window as any).paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'pay',
      },
      createOrder: (data: any, actions: any) => {
        const pending = this.pendingPlan();
        const price = pending ? pending.price : (this.subInfo()?.planPrice || '29.99');
        const planName = pending ? pending.name : (this.subInfo()?.planName || 'Pro');

        return actions.order.create({
          purchase_units: [
            {
              amount: {
                currency_code: 'USD',
                value: String(price),
              },
              description: `Renovación de Suscripción Siscop - Plan ${planName}`,
            },
          ],
        });
      },
      onApprove: async (data: any, actions: any) => {
        this.isProcessing.set(true);
        this.paymentStatus.set(null);
        try {
          const pending = this.pendingPlan();
          await this.paymentService.capturePayPal(data.orderID, pending?.id);
          this.paymentStatus.set({
            success: true,
            message: '¡Pago recibido con éxito a través de PayPal! Tu suscripción ha sido extendida 30 días.',
          });
          await this.loadBillingData();
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
      },
      onCancel: (data: any) => {
        this.paymentStatus.set({
          success: false,
          message: 'Pago cancelado por el usuario. Tu plan no ha sido modificado.',
        });
        this.pendingPlan.set(null);
      }
    }).render('#paypal-button-container');
  }

  openSimulator() {
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
      const pending = this.pendingPlan();
      await this.paymentService.capturePayPal(this.simulatorOrderId(), pending?.id);
      this.paymentStatus.set({
        success: true,
        message: '¡Pago simulado procesado con éxito! Se ha registrado el pago mock y la suscripción se extendió 30 días.',
      });
      await this.loadBillingData();
      this.showSimulator.set(false);
    } catch (err) {
      this.paymentStatus.set({
        success: false,
        message: 'No se pudo registrar el pago mock. Es posible que el ID de orden ya exista.',
      });
    } finally {
      this.isProcessing.set(false);
    }
  }

  clearStatus() {
    this.paymentStatus.set(null);
  }

  // --- Delete Account ---
  openDeleteModal() {
    this.deletePassword.set('');
    this.deleteError.set(null);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal() {
    this.showDeleteModal.set(false);
    this.deletePassword.set('');
    this.deleteError.set(null);
  }

  updateDeletePassword(event: any) {
    this.deletePassword.set(event.target.value);
  }

  async confirmDeleteAccount() {
    if (!this.deletePassword()) {
      this.deleteError.set('La contraseña es requerida.');
      return;
    }

    try {
      this.isDeleting.set(true);
      this.deleteError.set(null);
      await this.tenantService.deleteMyAccount(this.deletePassword());
      // On success, force logout
      await this.authService.logout();
      this.router.navigate(['/login']);
    } catch (err: any) {
      this.deleteError.set(err.error?.message || 'Error al eliminar la cuenta. Verifica tu contraseña.');
      this.isDeleting.set(false);
    }
  }
}
