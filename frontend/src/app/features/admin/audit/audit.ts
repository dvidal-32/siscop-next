import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { AuditService } from '../../../core/services/audit.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface DiffItem {
  key: string;
  status: 'added' | 'removed' | 'modified' | 'unchanged';
  oldVal: any;
  newVal: any;
}

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit.html',
})
export class AuditComponent implements OnInit {
  private auditService = inject(AuditService);

  logs = signal<any[]>([]);
  isLoading = signal<boolean>(false);

  // Filters
  searchQuery = signal<string>('');
  selectedActionFilter = signal<string>('all');
  selectedModuleFilter = signal<string>('all');

  // Expansion state
  expandedLogs = signal<Set<string>>(new Set());

  // Cache for computed diffs
  private diffCache = new Map<string, DiffItem[]>();

  modules = computed(() => {
    const list = this.logs().map(log => log.module).filter(Boolean);
    return Array.from(new Set(list)).sort();
  });

  filteredLogs = computed(() => {
    let list = this.logs();
    const query = this.searchQuery().toLowerCase().trim();
    const action = this.selectedActionFilter();
    const moduleFilter = this.selectedModuleFilter();

    if (query) {
      list = list.filter(log => {
        const userName = `${log.user?.first_name || ''} ${log.user?.last_name || ''}`.toLowerCase();
        const userEmail = (log.user?.email || '').toLowerCase();
        const moduleName = (log.module || '').toLowerCase();
        const description = this.getDescription(log).toLowerCase();
        return userName.includes(query) || userEmail.includes(query) || moduleName.includes(query) || description.includes(query);
      });
    }

    if (action !== 'all') {
      list = list.filter(log => log.action === action);
    }

    if (moduleFilter !== 'all') {
      list = list.filter(log => log.module === moduleFilter);
    }

    return list;
  });

  // Stats
  totalCount = computed(() => this.logs().length);
  createsCount = computed(() => this.logs().filter(l => l.action === 'create').length);
  updatesCount = computed(() => this.logs().filter(l => l.action === 'update' || l.action === 'modify' || l.action === 'update_status' || l.action === 'update_bulk').length);
  deletesCount = computed(() => this.logs().filter(l => l.action === 'delete').length);

  async ngOnInit() {
    this.isLoading.set(true);
    await this.loadLogs();
    this.isLoading.set(false);
  }

  async loadLogs() {
    try {
      const data = await this.auditService.findAll();
      this.logs.set(data);
    } catch (err) {
      console.error('Error cargando logs de auditoría', err);
    }
  }

  toggleExpandLog(logId: string) {
    const set = new Set(this.expandedLogs());
    if (set.has(logId)) {
      set.delete(logId);
    } else {
      set.add(logId);
    }
    this.expandedLogs.set(set);
  }

  isLogExpanded(logId: string): boolean {
    return this.expandedLogs().has(logId);
  }

  // ── Human-Readable Descriptions ──

  private readonly MODULE_LABELS: Record<string, string> = {
    users: 'Usuarios',
    tenants: 'Empresas',
    roles: 'Roles',
    plans: 'Planes',
    taxes: 'Impuestos',
    settings: 'Configuración',
    'platform-settings': 'Ajustes de Plataforma',
    payments: 'Pagos',
  };

  private readonly ACTION_LABELS: Record<string, string> = {
    create: 'creó',
    update: 'modificó',
    update_status: 'cambió el estado de',
    update_bulk: 'actualizó masivamente',
    delete: 'eliminó',
    modify: 'modificó',
  };

  getModuleLabel(code: string): string {
    return this.MODULE_LABELS[code] || code;
  }

  getActionLabel(action: string): string {
    return this.ACTION_LABELS[action] || action;
  }

  getDescription(log: any): string {
    const userName = log.user ? `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim() : 'El sistema';
    const actionVerb = this.getActionLabel(log.action);
    const moduleLabel = this.getModuleLabel(log.module);

    // Try to extract a friendly entity name from old_value or new_value
    let entityName = '';
    try {
      const data = log.new_value ? (typeof log.new_value === 'object' ? log.new_value : JSON.parse(log.new_value)) : 
                   (log.old_value ? (typeof log.old_value === 'object' ? log.old_value : JSON.parse(log.old_value)) : null);
      if (data) {
        entityName = data.name || data.label || data.first_name || data.code || data.email || '';
        if (data.first_name && data.last_name) {
          entityName = `${data.first_name} ${data.last_name}`;
        }
      }
    } catch {}

    if (entityName) {
      return `${userName} ${actionVerb} "${entityName}" en ${moduleLabel}`;
    }
    return `${userName} ${actionVerb} un registro en ${moduleLabel}`;
  }

  getChangeSummary(log: any): string[] {
    const diff = this.getLogDiffCached(log);
    const changes = diff.filter(d => d.status !== 'unchanged');
    if (changes.length === 0) return ['Sin cambios detectados'];

    return changes.map(item => {
      const label = this.prettifyFieldName(item.key);
      if (item.status === 'added') {
        return `Se añadió ${label}: "${this.truncateValue(item.newVal)}"`;
      } else if (item.status === 'removed') {
        return `Se eliminó ${label}`;
      } else {
        return `${label} cambió de "${this.truncateValue(item.oldVal)}" a "${this.truncateValue(item.newVal)}"`;
      }
    });
  }

  prettifyFieldName(key: string): string {
    const map: Record<string, string> = {
      first_name: 'Nombre',
      last_name: 'Apellido',
      email: 'Email',
      name: 'Nombre',
      label: 'Etiqueta',
      code: 'Código',
      status: 'Estado',
      phone: 'Teléfono',
      plan_id: 'Plan',
      tax_id: 'RFC/NIT',
      legal_name: 'Razón Social',
      country: 'País',
      city: 'Ciudad',
      street: 'Calle',
      number: 'Número',
      postal_code: 'Código Postal',
      municipality: 'Municipio',
      whatsapp: 'WhatsApp',
      logo: 'Logo',
      price: 'Precio',
      max_users: 'Máx. Usuarios',
      description: 'Descripción',
      is_active: 'Activo',
      rate: 'Tasa',
      password_hash: 'Contraseña',
      created_at: 'Fecha Creación',
      updated_at: 'Fecha Actualización',
    };
    return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  private truncateValue(val: any): string {
    if (val === undefined || val === null) return '-';
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (str.length > 60) return str.substring(0, 57) + '...';
    // Mask sensitive fields
    if (str.startsWith('$2b$') || str.startsWith('$2a$')) return '••••••••';
    return str;
  }

  // ── Diff Logic ──

  getLogDiff(oldStr: string | null, newStr: string | null): DiffItem[] {
    let oldObj: any = null;
    let newObj: any = null;

    try { if (oldStr) oldObj = typeof oldStr === 'object' ? oldStr : JSON.parse(oldStr); } catch {}
    try { if (newStr) newObj = typeof newStr === 'object' ? newStr : JSON.parse(newStr); } catch {}

    if (!oldObj && !newObj) return [];

    const safeOld = oldObj || {};
    const safeNew = newObj || {};
    const allKeys = Array.from(new Set([...Object.keys(safeOld), ...Object.keys(safeNew)]));

    return allKeys.map(key => {
      const hasOld = key in safeOld;
      const hasNew = key in safeNew;
      const oldVal = safeOld[key];
      const newVal = safeNew[key];

      let status: 'added' | 'removed' | 'modified' | 'unchanged' = 'unchanged';
      if (!hasOld && hasNew) status = 'added';
      else if (hasOld && !hasNew) status = 'removed';
      else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) status = 'modified';

      return { key, status, oldVal: hasOld ? oldVal : undefined, newVal: hasNew ? newVal : undefined };
    });
  }

  getLogDiffCached(log: any): DiffItem[] {
    if (!log) return [];
    const logId = String(log.id);
    if (!this.diffCache.has(logId)) {
      this.diffCache.set(logId, this.getLogDiff(log.old_value, log.new_value));
    }
    return this.diffCache.get(logId)!;
  }

  formatDiffValue(val: any): string {
    if (val === undefined || val === null) return '-';
    // Mask hashed passwords
    const str = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
    if (str.startsWith('$2b$') || str.startsWith('$2a$')) return '••••••••';
    return str;
  }

  getUserInitials(log: any): string {
    if (!log.user) return 'SYS';
    return ((log.user.first_name?.charAt(0) || '') + (log.user.last_name?.charAt(0) || '')).toUpperCase() || 'U';
  }

  getActionIcon(action: string): string {
    switch (action) {
      case 'create': return 'pi pi-plus';
      case 'delete': return 'pi pi-trash';
      case 'update_status': return 'pi pi-sync';
      default: return 'pi pi-pencil';
    }
  }

  getActionColor(action: string): string {
    switch (action) {
      case 'create': return 'emerald';
      case 'delete': return 'rose';
      default: return 'indigo';
    }
  }

  getRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Hace un momento';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Hace ${days}d`;
    return date.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
