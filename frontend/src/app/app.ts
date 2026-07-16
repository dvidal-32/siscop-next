import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');

  // Inyectar ThemeService en el root para que se inicialice una sola vez
  // y aplique el color guardado antes de que se pinte la UI
  private themeService = inject(ThemeService);
}
