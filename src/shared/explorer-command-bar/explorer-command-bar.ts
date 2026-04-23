import { Component, input, model, output } from '@angular/core';

/** File Explorer–style command row; project into `app-window-chrome` with `[appWindowSubheader]`. */
@Component({
  selector: 'app-explorer-command-bar[appWindowSubheader]',
  imports: [],
  templateUrl: './explorer-command-bar.html',
  styleUrl: './explorer-command-bar.scss',
})
export class ExplorerCommandBar {
  /** Bound from parent; filters the This PC list. */
  readonly searchQuery = model('');

  /** Single-line address label (e.g. “My PC”, “Desktop”). */
  readonly addressText = input('My PC');

  /** When true, the Up control is clickable and emits {@link upClick}. */
  readonly navigateUpEnabled = input(false);

  /** Address-bar refresh control — parent may flash the file list. */
  readonly retryClick = output<void>();

  /** Toolbar “Up” — parent typically returns to the parent folder. */
  readonly upClick = output<void>();

  protected onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected readonly iconBackward = 'assets/backward-arrow.png';
  protected readonly iconForward = 'assets/forward-arrow.png';
  protected readonly iconUp = 'assets/up-arrow.png';
  protected readonly iconRetry = 'assets/retry.png';
  protected readonly iconMagnifier = 'assets/magnifier.png';
  protected readonly iconThisPc = 'assets/this-pc.png';
}
