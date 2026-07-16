import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { AuditService } from '../../core/services/audit.service';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private auditService = inject(AuditService);

  user = computed(() => this.authService.currentUser());
  recentLogs = signal<any[]>([]);

  remainingDays = computed(() => {
    const u = this.user();
    if (!u || !u.subscription || !u.subscription.endDate) {
      return null;
    }
    const endDate = new Date(u.subscription.endDate);
    const now = new Date();
    
    // Normalize dates to midnight for an accurate calendar-day difference
    const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const d2 = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  });

  remainingDaysPercent = computed(() => {
    const days = this.remainingDays();
    if (days === null) return 0;
    const percent = (days / 30) * 100;
    return Math.min(100, Math.max(0, percent));
  });

  async ngOnInit() {
    try {
      await this.authService.loadCurrentUser();
      const logs = await this.auditService.findAll();
      this.recentLogs.set(logs.slice(0, 5));
    } catch (err) {
      console.error('Error recargando métricas del dashboard:', err);
    }
  }
}
