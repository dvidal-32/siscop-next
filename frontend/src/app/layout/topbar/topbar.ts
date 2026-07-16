import { Component, inject, computed, Output, EventEmitter, signal, OnInit, HostListener } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { PlatformService } from '../../core/services/platform.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './topbar.html',
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-8px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0)   scale(1); }
    }
    .animate-fade-in {
      animation: fadeIn 0.18s ease-out both;
    }
  `]
})
export class TopbarComponent implements OnInit {
  private authService  = inject(AuthService);
  readonly themeService = inject(ThemeService);
  private platformService = inject(PlatformService);
  private router       = inject(Router);

  @Output() toggleMenu = new EventEmitter<void>();

  user             = computed(() => this.authService.currentUser());
  isDarkMode       = signal<boolean>(true);
  showPaletteMenu  = signal<boolean>(false);

  // Impersonation
  isSuperAdmin     = computed(() => this.user()?.realTenantId === null && this.user()?.realTenantId !== undefined);
  isImpersonating  = signal<boolean>(false);
  tenants          = signal<any[]>([]);
  showTenantSelector = signal<boolean>(false);
  tenantSearch     = signal<string>('');
  filteredTenants  = computed(() => {
    const search = this.tenantSearch().toLowerCase();
    if (!search) return this.tenants();
    return this.tenants().filter((t: any) =>
      t.name.toLowerCase().includes(search) || t.id.toLowerCase().includes(search)
    );
  });
  impersonatedTenantName = signal<string | null>(null);

  // Exponer datos del ThemeService
  primaryColors  = this.themeService.getPrimaryColors();
  surfaceColors  = this.themeService.getSurfaceColors();
  presets        = this.themeService.getPresets();

  ngOnInit() {
    const isLight = localStorage.getItem('theme') === 'light';
    this.isDarkMode.set(!isLight);

    // Initialize impersonation state from localStorage
    const impersonatedId = localStorage.getItem('impersonated_tenant_id');
    if (impersonatedId) {
      this.isImpersonating.set(true);
      const currentUser = this.user();
      if (currentUser?.tenant?.name) {
        this.impersonatedTenantName.set(currentUser.tenant.name);
      }
    }
  }

  toggleDarkMode() {
    const htmlElement = document.documentElement;
    if (htmlElement.classList.contains('dark')) {
      htmlElement.classList.remove('dark');
      this.isDarkMode.set(false);
      localStorage.setItem('theme', 'light');
    } else {
      htmlElement.classList.add('dark');
      this.isDarkMode.set(true);
      localStorage.setItem('theme', 'dark');
    }
  }

  togglePaletteMenu() {
    this.showPaletteMenu.update(v => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.showPaletteMenu()) {
      const target = event.target as HTMLElement;
      if (!target.closest('.palette-container')) {
        this.showPaletteMenu.set(false);
      }
    }
    if (this.showTenantSelector()) {
      const target = event.target as HTMLElement;
      if (!target.closest('.tenant-selector-container')) {
        this.showTenantSelector.set(false);
      }
    }
  }

  selectPrimary(name: string) {
    this.themeService.setPrimaryColor(name);
  }

  selectSurface(name: string) {
    this.themeService.setSurface(name);
  }

  selectPreset(name: string) {
    this.themeService.setPreset(name);
  }

  // ── Impersonation Methods ──

  async toggleTenantSelector() {
    if (!this.showTenantSelector()) {
      // Load tenants on first open
      if (this.tenants().length === 0) {
        try {
          const data = await this.platformService.getAllTenants();
          this.tenants.set(data);
        } catch (err) {
          console.error('Error loading tenants for impersonation', err);
        }
      }
    }
    this.tenantSearch.set('');
    this.showTenantSelector.update(v => !v);
  }

  async impersonateTenant(tenant: any) {
    localStorage.setItem('impersonated_tenant_id', tenant.id);
    this.isImpersonating.set(true);
    this.impersonatedTenantName.set(tenant.name);
    this.showTenantSelector.set(false);
    // Reload user context so the entire app reflects the impersonated tenant
    await this.authService.loadCurrentUser();
    this.router.navigate(['/dashboard']);
  }

  async exitImpersonation() {
    localStorage.removeItem('impersonated_tenant_id');
    this.isImpersonating.set(false);
    this.impersonatedTenantName.set(null);
    this.showTenantSelector.set(false);
    // Reload user context back to SuperAdmin
    await this.authService.loadCurrentUser();
    this.router.navigate(['/dashboard']);
  }

  async logout() {
    localStorage.removeItem('impersonated_tenant_id');
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
