import { Component, input, output } from '@angular/core';

/** One alphabetical group in the “All apps” list (icon column is empty until assets are added). */
export interface StartMenuAppGroup {
  readonly letter: string;
  readonly labels: readonly string[];
}

const DEFAULT_GROUPS: readonly StartMenuAppGroup[] = [
  {
    letter: 'C',
    labels: ['Calculator', 'Calendar', 'Camera', 'Cheat Engine', 'Chrome Apps'],
  },
  {
    letter: 'D',
    labels: ['Docker Desktop', 'DuckDuckGo'],
  },
  {
    letter: 'M',
    labels: ['Mail', 'Maps', 'Microsoft Edge', 'Movies & TV'],
  },
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

  protected readonly groups = DEFAULT_GROUPS;

  protected onBackdropClick(): void {
    this.close.emit();
  }
}
