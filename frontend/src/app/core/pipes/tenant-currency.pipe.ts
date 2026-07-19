import { Pipe, PipeTransform, inject } from '@angular/core';
import { TenantService } from '../services/tenant.service';

@Pipe({
  name: 'tenantCurrency',
  standalone: true
})
export class TenantCurrencyPipe implements PipeTransform {
  private tenantService = inject(TenantService);

  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined) return '';

    const numValue = Number(value);
    if (isNaN(numValue)) return String(value);

    // Read settings from TenantService signal
    const settings = this.tenantService.tenantSettings();
    
    // Find the relevant currency settings
    const codigoSetting = settings.find(s => s.key === 'MONEDA_CODIGO');
    const simboloSetting = settings.find(s => s.key === 'MONEDA_SIMBOLO');
    const localeSetting = settings.find(s => s.key === 'MONEDA_LOCALE');

    const currencyCode = codigoSetting?.value || 'USD';
    const currencySymbol = simboloSetting?.value || '$';
    const locale = localeSetting?.value || 'en-US';

    try {
      // Use Intl.NumberFormat to format the number
      const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
      });

      // Sometimes Intl.NumberFormat puts its own symbol which may not match MONEDA_SIMBOLO
      // If we want to force MONEDA_SIMBOLO we can format as decimal and prepend/append it manually
      // Or we can rely on Intl if currencyCode is standardized.
      // A common approach is to format as decimal to get the correct thousand/decimal separators 
      // based on the locale, and then manually attach the custom symbol requested by the user.
      const formattedNumber = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(numValue);

      return `${currencySymbol} ${formattedNumber}`;
    } catch (e) {
      // Fallback in case of invalid locale string
      const formattedNumber = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(numValue);
      return `${currencySymbol} ${formattedNumber}`;
    }
  }
}
