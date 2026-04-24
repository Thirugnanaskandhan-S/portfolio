import { Component, input, output } from '@angular/core';

interface StartMenuApp {
  readonly id: string;
  readonly label: string;
  readonly iconSrc: string;
}

const DEFAULT_APPS: readonly StartMenuApp[] = [
  { id: 'this-pc', label: 'This PC', iconSrc: 'assets/this-pc.png' },
  { id: 'resume', label: 'Resume', iconSrc: 'assets/pdf.svg' },
  { id: 'integrator', label: 'Integrator', iconSrc: 'assets/pdf.svg' },
  { id: 'cactus', label: 'Cactus', iconSrc: 'assets/pdf.svg' },
  {
    id: 'banking-reconciliation-tool',
    label: 'Banking Reconciliation Tool',
    iconSrc: 'assets/pdf.svg',
  },
  { id: 'superlabels', label: 'Superlabels', iconSrc: 'assets/pdf.svg' },
];

/**
 * Windows-style Start menu shell: narrow left rail + scrollable app list.
 * Slides up from the bottom of the screen; search row is intentionally omitted.
 */
@Component({
  selector: 'app-start-menu',
  imports: [],
  templateUrl: './start-menu.html',
  styleUrl: './start-menu.scss',
})
export class StartMenu {
  /** When true, the panel animates in and the dimmed backdrop accepts clicks to dismiss. */
  open = input(false);

  /** User dismissed via backdrop (or host may close on the same Start click). */
  close = output<void>();

  protected readonly apps = DEFAULT_APPS;

  protected onBackdropClick(): void {
    this.close.emit();
  }
}
