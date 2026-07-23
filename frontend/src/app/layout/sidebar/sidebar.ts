import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MenuService } from '../../core/services/menu.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
})
export class SidebarComponent implements OnInit {
  private menuService = inject(MenuService);

  menuItems     = signal<any[]>([]);
  expandedItems = signal<{ [key: string]: boolean }>({});

  async ngOnInit() {
    try {
      const items = await this.menuService.getMyMenu();
      this.menuItems.set(items);
    } catch (err) {
      console.error('Error cargando el menú dinámico', err);
    }
  }

  toggleExpand(itemCode: string) {
    this.expandedItems.update((state) => {
      const isCurrentlyExpanded = !!state[itemCode];
      const newState: { [key: string]: boolean } = {};
      if (!isCurrentlyExpanded) {
        newState[itemCode] = true;
      }
      return newState;
    });
  }

  getIconClass(item: any): string {
    const iconMap: { [key: string]: string } = {
      'dashboard':     'pi pi-home',
      'admin':         'pi pi-cog',
      'admin.company': 'pi pi-building',
      'admin.users':   'pi pi-users',
      'admin.roles':   'pi pi-shield',
      'operations':    'pi pi-wrench',
      'admin.lines-colors': 'pi pi-palette',
      'admin.catalog': 'pi pi-folder-open',
      'admin.audit':   'pi pi-clock',
      'billing':       'pi pi-credit-card',
      'superadmin':    'pi pi-sliders-h',
      'superadmin.plans': 'pi pi-ticket',
      'superadmin.settings': 'pi pi-cog',
      'superadmin.tenants': 'pi pi-building',
      'inventory': 'pi pi-box',
      'inventory.dashboard': 'pi pi-chart-line',
      'inventory.kardex': 'pi pi-list',
      'inventory.purchase-orders': 'pi pi-shopping-cart',
      'inventory.suppliers': 'pi pi-truck',
      'inventory.warehouses': 'pi pi-building',
    };
    return iconMap[item.code] || 'pi pi-folder';
  }
}
