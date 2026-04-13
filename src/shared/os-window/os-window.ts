import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import { WindowChrome } from '../window-chrome/window-chrome';

const VIEW_PAD = 4;

@Component({
  selector: 'app-os-window',
  imports: [WindowChrome],
  templateUrl: './os-window.html',
  styleUrl: './os-window.scss',
})
export class OsWindow {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly winEl = viewChild<ElementRef<HTMLElement>>('win');

  title = input.required<string>();
  /** Optional icon shown before the title (app-relative asset URL, e.g. `assets/this-pc.png`). */
  titleIcon = input<string | undefined>(undefined);
  /** When `true`, render a subheader row from projected `[appWindowSubheader]` content. */
  subheader = input(false);
  /** When `true`, body is an iframe with {@link src}. When `false`, projected content (`ng-content`). */
  useIframe = input(true);
  /** App-relative URL for the iframe (PDF, etc.). Ignored when `useIframe` is `false`. */
  src = input<string | undefined>(undefined);
  maximized = input(false);

  windowClose = output<void>();
  windowMinimize = output<void>();
  windowToggleMax = output<void>();

  protected readonly winX = signal(0);
  protected readonly winY = signal(0);
  /** After first layout, we switch from CSS-centered to pixel `left`/`top` for dragging. */
  protected readonly positionReady = signal(false);
  protected readonly titleDragging = signal(false);

  /** Position before last maximize; restored when un-maximizing. */
  private preMaxPos: { x: number; y: number } | null = null;

  protected readonly safeSrc = computed(() => {
    const u = this.src();
    return this.sanitizer.bypassSecurityTrustResourceUrl(u ?? 'about:blank');
  });

  protected readonly winLeftPx = computed(() => {
    if (this.maximized() || !this.positionReady()) return null;
    return this.winX();
  });

  protected readonly winTopPx = computed(() => {
    if (this.maximized() || !this.positionReady()) return null;
    return this.winY();
  });

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    afterNextRender(() => {
      const el = this.winEl()?.nativeElement;
      if (!el) return;
      const r = el.getBoundingClientRect();
      this.winX.set(r.left);
      this.winY.set(r.top);
      this.positionReady.set(true);
    });

    effect(() => {
      const max = this.maximized();
      if (max && this.positionReady()) {
        this.preMaxPos = { x: this.winX(), y: this.winY() };
      } else if (!max && this.preMaxPos) {
        const c = this.clampPos(this.preMaxPos.x, this.preMaxPos.y);
        this.winX.set(c.x);
        this.winY.set(c.y);
        this.preMaxPos = null;
      }
    });
  }

  onTitleBarDblClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('.window-chrome__controls')) return;
    this.windowToggleMax.emit();
  }

  onTitleBarPointerDown(event: PointerEvent): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.maximized()) return;
    if (event.button !== 0) return;
    const t = event.target as HTMLElement | null;
    if (t?.closest('.window-chrome__controls')) return;

    event.preventDefault();

    const el = this.winEl()?.nativeElement;
    if (!el || !this.positionReady()) return;

    const startX = event.clientX;
    const startY = event.clientY;
    const originX = this.winX();
    const originY = this.winY();

    this.titleDragging.set(true);

    const titlebar = t?.closest('.window-chrome__titlebar') as HTMLElement | null;
    if (titlebar) {
      try {
        titlebar.setPointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
    }

    const onMove = (pe: PointerEvent) => {
      const dx = pe.clientX - startX;
      const dy = pe.clientY - startY;
      const next = this.clampPos(originX + dx, originY + dy);
      this.winX.set(next.x);
      this.winY.set(next.y);
    };

    const onUp = (pe: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      this.titleDragging.set(false);
      if (titlebar) {
        try {
          titlebar.releasePointerCapture(pe.pointerId);
        } catch {
          /* ignore */
        }
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  private clampPos(x: number, y: number): { x: number; y: number } {
    const el = this.winEl()?.nativeElement;
    if (!el || typeof window === 'undefined') return { x, y };
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxX = Math.max(VIEW_PAD, vw - w - VIEW_PAD);
    const maxY = Math.max(VIEW_PAD, vh - h - VIEW_PAD);
    return {
      x: Math.min(maxX, Math.max(VIEW_PAD, x)),
      y: Math.min(maxY, Math.max(VIEW_PAD, y)),
    };
  }
}
