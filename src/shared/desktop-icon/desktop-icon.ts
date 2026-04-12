import { Component, computed, input, output } from '@angular/core';

/** Extend when adding new desktop shortcuts; map file in {@link DESKTOP_ICON_SRC}. */
export type DesktopIconVariant = 'this-pc' | 'resume' | 'my-projects';

const DESKTOP_ICON_SRC = {
  'this-pc': 'assets/this-pc.png',
  resume: 'assets/pdf.svg',
  'my-projects': 'assets/folder.png',
} as const satisfies Record<DesktopIconVariant, string>;

export function desktopIconAssetPath(variant: DesktopIconVariant): string {
  return DESKTOP_ICON_SRC[variant];
}

@Component({
  selector: 'app-desktop-icon',
  imports: [],
  templateUrl: './desktop-icon.html',
  styleUrl: './desktop-icon.scss',
})
export class DesktopIcon {
  variant = input.required<DesktopIconVariant>();
  label = input.required<string>();
  selected = input(false);

  /** Keyboard activation only; pointer selection is handled by the desktop shell. */
  selectedChange = output<boolean>();

  protected readonly iconSrc = computed(() => DESKTOP_ICON_SRC[this.variant()]);

  onKeyActivate(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    this.selectedChange.emit(true);
  }
}
