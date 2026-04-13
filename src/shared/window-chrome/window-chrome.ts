import { Component, input, output } from '@angular/core';

/**
 * Reusable desktop-style window chrome: title bar (icon, title, min / max / close) plus an
 * optional subheader row (toolbar, address bar, search, etc.). Project subheader content with
 * `[appWindowSubheader]` — use from `app-os-window` or embed directly in other shells.
 */
@Component({
  selector: 'app-window-chrome',
  imports: [],
  templateUrl: './window-chrome.html',
  styleUrl: './window-chrome.scss',
})
export class WindowChrome {
  title = input.required<string>();
  titleIcon = input<string | undefined>(undefined);
  /** When `true`, show the row below the title bar and project `[appWindowSubheader]` into it. */
  subheader = input(false);
  maximized = input(false);

  windowClose = output<void>();
  windowMinimize = output<void>();
  windowToggleMax = output<void>();

  /** For host window drag / maximize behavior (e.g. `app-os-window`). */
  titleBarDblClick = output<MouseEvent>();
  titleBarPointerDown = output<PointerEvent>();

  protected onTitleBarDblClick(event: MouseEvent): void {
    this.titleBarDblClick.emit(event);
  }

  protected onTitleBarPointerDown(event: PointerEvent): void {
    this.titleBarPointerDown.emit(event);
  }
}
