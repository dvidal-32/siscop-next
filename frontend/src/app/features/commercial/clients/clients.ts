import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CommercialService } from '../../../core/services/commercial.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './clients.html',
})
export class ClientsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private commercialService = inject(CommercialService);
  authService = inject(AuthService);

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  isSaving = signal<boolean>(false);

  clients = signal<any[]>([]);
  showModal = signal<boolean>(false);
  selectedClient = signal<any | null>(null);

  // Contact panel state
  showContactsPanel = signal<boolean>(false);
  activeClientForContacts = signal<any | null>(null);
  contacts = signal<any[]>([]);
  showContactModal = signal<boolean>(false);
  selectedContact = signal<any | null>(null);

  clientForm = this.fb.group({
    name: ['', [Validators.required]],
    tax_id: [''],
    email: ['', [Validators.email]],
    phone: [''],
    address: [''],
    price_list_level: [1, [Validators.required]],
    is_active: [true],
  });

  contactForm = this.fb.group({
    first_name: ['', [Validators.required]],
    last_name: [''],
    email: ['', [Validators.email]],
    phone: [''],
    position: [''],
  });

  get filteredClients() {
    return this.clients();
  }

  async ngOnInit() {
    await this.loadClients();
  }

  async loadClients() {
    this.isLoading.set(true);
    try {
      const data = await this.commercialService.getClients();
      this.clients.set(data);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error al cargar clientes');
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreate() {
    this.selectedClient.set(null);
    this.clientForm.reset({ is_active: true, price_list_level: 1 });
    this.showModal.set(true);
  }

  openEdit(client: any) {
    this.selectedClient.set(client);
    this.clientForm.patchValue({
      name: client.name,
      tax_id: client.tax_id || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      price_list_level: client.price_list_level || 1,
      is_active: client.is_active,
    });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedClient.set(null);
    this.clientForm.reset({ is_active: true, price_list_level: 1 });
  }

  async save() {
    if (this.clientForm.invalid) return;
    this.isSaving.set(true);
    this.errorMessage.set(null);

    try {
      const formData = this.clientForm.value;
      if (this.selectedClient()) {
        await this.commercialService.updateClient(this.selectedClient().id, formData);
        this.successMessage.set('Cliente actualizado correctamente');
      } else {
        await this.commercialService.createClient(formData);
        this.successMessage.set('Cliente creado correctamente');
      }
      this.closeModal();
      await this.loadClients();
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error al guardar cliente');
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteClient(client: any) {
    if (!confirm(`¿Eliminar al cliente "${client.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await this.commercialService.deleteClient(client.id);
      this.successMessage.set('Cliente eliminado correctamente');
      await this.loadClients();
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error al eliminar cliente');
    }
  }

  // ──────────────────────────────────────────
  // CONTACTS
  // ──────────────────────────────────────────

  async openContactsPanel(client: any) {
    this.activeClientForContacts.set(client);
    this.showContactsPanel.set(true);
    this.isLoading.set(true);
    try {
      const data = await this.commercialService.getContacts(client.id);
      this.contacts.set(data);
    } catch (err: any) {
      this.errorMessage.set('Error al cargar contactos');
    } finally {
      this.isLoading.set(false);
    }
  }

  closeContactsPanel() {
    this.showContactsPanel.set(false);
    this.activeClientForContacts.set(null);
    this.contacts.set([]);
  }

  openCreateContact() {
    this.selectedContact.set(null);
    this.contactForm.reset();
    this.showContactModal.set(true);
  }

  openEditContact(contact: any) {
    this.selectedContact.set(contact);
    this.contactForm.patchValue({
      first_name: contact.first_name,
      last_name: contact.last_name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      position: contact.position || '',
    });
    this.showContactModal.set(true);
  }

  closeContactModal() {
    this.showContactModal.set(false);
    this.selectedContact.set(null);
    this.contactForm.reset();
  }

  async saveContact() {
    if (this.contactForm.invalid || !this.activeClientForContacts()) return;
    this.isSaving.set(true);

    try {
      const formData = this.contactForm.value;
      if (this.selectedContact()) {
        await this.commercialService.updateContact(this.selectedContact().id, formData);
      } else {
        await this.commercialService.createContact(this.activeClientForContacts().id, formData);
      }
      const data = await this.commercialService.getContacts(this.activeClientForContacts().id);
      this.contacts.set(data);
      this.closeContactModal();
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error al guardar contacto');
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteContact(contact: any) {
    if (!confirm(`¿Eliminar al contacto "${contact.first_name}"?`)) return;
    try {
      await this.commercialService.deleteContact(contact.id);
      const data = await this.commercialService.getContacts(this.activeClientForContacts().id);
      this.contacts.set(data);
    } catch (err: any) {
      this.errorMessage.set('Error al eliminar contacto');
    }
  }
}
