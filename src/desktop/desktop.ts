import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import {
  DesktopIcon,
  type DesktopIconVariant,
  desktopIconAssetPath,
} from '../shared/desktop-icon/desktop-icon';
import { OsWindow } from '../shared/os-window/os-window';
import { Taskbar, type DarkModeChangeDetail, type TaskbarTaskItem } from '../shared/taskbar/taskbar';

const RESUME_PDF_SRC = 'assets/Resume.pdf';

/** Relative to `<base href>` — must match `index.html` / taskbar theme. */
const DESKTOP_WALLPAPER_DAY = 'url(assets/windows-xp-day.png)';
const DESKTOP_WALLPAPER_NIGHT = 'url(assets/windows-xp-night.png)';

/** Window chrome + taskbar label for the in-app PDF viewer (app name — file name). */
const PDF_VIEWER_TITLE = 'File Engine - Resume.pdf';

const DRAG_THRESHOLD_PX = 5;

function cmToPx(cm: number, anchor: HTMLElement): number {
  const probe = document.createElement('div');
  probe.style.width = `${cm}cm`;
  probe.style.height = '0';
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  anchor.appendChild(probe);
  const w = probe.getBoundingClientRect().width;
  anchor.removeChild(probe);
  return w;
}

@Component({
  selector: 'app-desktop',
  imports: [DesktopIcon, OsWindow, Taskbar],
  templateUrl: './desktop.html',
  styleUrl: './desktop.scss',
})
export class Desktop implements OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  protected readonly surface = viewChild<ElementRef<HTMLElement>>('surface');
  protected readonly backdrop = viewChild<ElementRef<HTMLElement>>('backdrop');

  /** Current wallpaper after any reveal completes (day = false). */
  protected readonly isNightWallpaper = signal(false);
  /** Incoming image during radial reveal; `null` when idle. */
  protected readonly revealWallpaper = signal<string | null>(null);
  protected readonly revealExpand = signal(false);
  /** Reveal origin as % of `.desktop-backdrop` (matches toggle via taskbar). */
  protected readonly revealOriginXPct = signal(50);
  protected readonly revealOriginYPct = signal(50);

  protected readonly baseWallpaper = computed(() =>
    this.isNightWallpaper() ? DESKTOP_WALLPAPER_NIGHT : DESKTOP_WALLPAPER_DAY,
  );

  private pendingTargetNight: boolean | null = null;
  private revealDoneTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly variants: DesktopIconVariant[] = ['this-pc', 'resume', 'my-projects'];
  protected readonly labels: Record<DesktopIconVariant, string> = {
    'this-pc': 'This PC',
    resume: 'Resume',
    'my-projects': 'My Projects',
  };

  protected readonly selectedVariant = signal<DesktopIconVariant | null>(null);
  protected readonly draggingVariant = signal<DesktopIconVariant | null>(null);

  /** In-app PDF viewer (File Engine; not a browser tab). */
  protected readonly resumeWindow = signal<{
    open: boolean;
    minimized: boolean;
    maximized: boolean;
  }>({ open: false, minimized: false, maximized: false });

  protected readonly resumePdfSrc = RESUME_PDF_SRC;

  protected readonly pdfViewerTitle = PDF_VIEWER_TITLE;

  /** Open windows mirrored on the taskbar (Start-adjacent). */
  protected readonly taskbarTasks = computed((): TaskbarTaskItem[] => {
    const w = this.resumeWindow();
    if (!w.open) return [];
    return [
      {
        id: 'resume',
        title: PDF_VIEWER_TITLE,
        iconSrc: desktopIconAssetPath('resume'),
        minimized: w.minimized,
      },
    ];
  });

  protected readonly iconPositions = signal<
    Record<DesktopIconVariant, { row: number; col: number }>
  >({
    'this-pc': { row: 0, col: 0 },
    resume: { row: 1, col: 0 },
    'my-projects': { row: 2, col: 0 },
  });

  private gridMetrics = signal<{
    cellW: number;
    cellH: number;
    iconW: number;
    iconH: number;
    maxCol: number;
    maxRow: number;
  } | null>(null);

  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    afterNextRender(() => {
      const surf = this.surface()?.nativeElement;
      if (!surf) return;
      this.measureGrid(surf);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = this.surface()?.nativeElement;
          if (el) this.measureGrid(el);
        });
      });
      this.resizeObserver = new ResizeObserver(() => {
        const el = this.surface()?.nativeElement;
        if (el) this.measureGrid(el);
      });
      this.resizeObserver.observe(surf);
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.clearRevealFallbackTimer();
  }

  /** Theme toggle: radial reveal then commit night/day. */
  protected onDarkModeChange(detail: DarkModeChangeDetail): void {
    const targetNight = detail.checked;
    if (!isPlatformBrowser(this.platformId)) {
      this.isNightWallpaper.set(targetNight);
      this.syncWallpaperCssVar();
      return;
    }
    if (this.revealWallpaper() !== null) return;
    if (targetNight === this.isNightWallpaper()) return;

    this.#setRevealOriginFromViewport(detail.originX, detail.originY);

    this.pendingTargetNight = targetNight;
    this.revealExpand.set(false);
    this.revealWallpaper.set(targetNight ? DESKTOP_WALLPAPER_NIGHT : DESKTOP_WALLPAPER_DAY);

    this.clearRevealFallbackTimer();
    this.revealDoneTimer = globalThis.setTimeout(() => {
      this.revealDoneTimer = null;
      if (this.pendingTargetNight !== null) {
        this.finishWallpaperReveal();
      }
    }, 1200);

    globalThis.setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.revealExpand.set(true);
        });
      });
    }, 0);
  }

  protected onWallpaperRevealEnd(event: TransitionEvent): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const t = event.target;
    if (!(t instanceof HTMLElement) || t !== event.currentTarget) return;
    if (event.propertyName !== 'clip-path' && event.propertyName !== '-webkit-clip-path') return;
    if (this.pendingTargetNight === null) return;
    this.clearRevealFallbackTimer();
    this.finishWallpaperReveal();
  }

  private finishWallpaperReveal(): void {
    if (this.pendingTargetNight === null) return;
    const night = this.pendingTargetNight;
    this.pendingTargetNight = null;
    this.isNightWallpaper.set(night);
    this.revealWallpaper.set(null);
    this.revealExpand.set(false);
    this.syncWallpaperCssVar();
  }

  private clearRevealFallbackTimer(): void {
    if (this.revealDoneTimer !== null) {
      clearTimeout(this.revealDoneTimer);
      this.revealDoneTimer = null;
    }
  }

  private syncWallpaperCssVar(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.document.documentElement.style.setProperty(
      '--desktop-wallpaper',
      this.isNightWallpaper() ? DESKTOP_WALLPAPER_NIGHT : DESKTOP_WALLPAPER_DAY,
    );
  }

  /** Map toggle center (viewport px) to % of backdrop for `clip-path: circle(... at x y)`. */
  #setRevealOriginFromViewport(originX: number, originY: number): void {
    const el = this.backdrop()?.nativeElement;
    if (!el) {
      this.revealOriginXPct.set(50);
      this.revealOriginYPct.set(50);
      return;
    }
    const bd = el.getBoundingClientRect();
    if (bd.width <= 0 || bd.height <= 0) {
      this.revealOriginXPct.set(50);
      this.revealOriginYPct.set(50);
      return;
    }
    this.revealOriginXPct.set(((originX - bd.left) / bd.width) * 100);
    this.revealOriginYPct.set(((originY - bd.top) / bd.height) * 100);
  }

  /** Slots are `position:absolute` inside `.desktop-icons` (not the padded surface), so no extra pad offset. */
  protected iconLeft(v: DesktopIconVariant): number {
    const m = this.gridMetrics();
    if (!m) return 0;
    return this.iconPositions()[v].col * m.cellW;
  }

  protected iconTop(v: DesktopIconVariant): number {
    const m = this.gridMetrics();
    if (!m) return 0;
    return this.iconPositions()[v].row * m.cellH;
  }

  protected onKeyboardSelect(v: DesktopIconVariant): void {
    this.selectedVariant.set(v);
  }

  protected onSlotDblClick(v: DesktopIconVariant, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (v !== 'resume') return;
    this.resumeWindow.update((s) => ({
      open: true,
      minimized: false,
      maximized: s.maximized,
    }));
  }

  protected closeResumeWindow(): void {
    this.resumeWindow.set({ open: false, minimized: false, maximized: false });
  }

  protected minimizeResumeWindow(): void {
    this.resumeWindow.update((s) => ({ ...s, minimized: true }));
  }

  protected toggleResumeMaximize(): void {
    this.resumeWindow.update((s) => ({ ...s, maximized: !s.maximized }));
  }

  protected restoreResumeWindow(): void {
    this.resumeWindow.update((s) => ({ ...s, minimized: false }));
  }

  protected onTaskbarTaskActivate(id: string): void {
    if (id !== 'resume') return;
    const w = this.resumeWindow();
    if (w.minimized) this.restoreResumeWindow();
    else this.minimizeResumeWindow();
  }

  private measureGrid(surfaceEl: HTMLElement): void {
    const iconsEl = surfaceEl.querySelector('.desktop-icons') as HTMLElement | null;
    const iconEl = surfaceEl.querySelector('.desk-icon') as HTMLElement | null;
    if (!iconsEl || !iconEl) {
      queueMicrotask(() => {
        const retry = this.surface()?.nativeElement;
        if (retry) this.measureGrid(retry);
      });
      return;
    }

    const iconRect = iconEl.getBoundingClientRect();
    const iconW = iconRect.width;
    const iconH = iconRect.height;

    const gapX = cmToPx(0.2, surfaceEl);
    const gapY = cmToPx(0.8, surfaceEl);

    const cellW = iconW + gapX;
    const cellH = iconH + gapY;

    const spanX = iconsEl.clientWidth;
    const spanY = iconsEl.clientHeight;

    const maxCol = Math.max(0, Math.floor(Math.max(0, spanX - iconW) / cellW));
    const maxRow = Math.max(0, Math.floor(Math.max(0, spanY - iconH) / cellH));

    this.gridMetrics.set({
      cellW,
      cellH,
      iconW,
      iconH,
      maxCol,
      maxRow,
    });

    this.iconPositions.update((pos) => {
      const next = { ...pos };
      for (const key of this.variants) {
        const p = next[key];
        next[key] = {
          col: Math.min(p.col, maxCol),
          row: Math.min(p.row, maxRow),
        };
      }
      return next;
    });
  }

  /** Re-run layout metrics after the DOM catches up (stable cell sizes). */
  private scheduleMeasureGrid(): void {
    requestAnimationFrame(() => {
      const surf = this.surface()?.nativeElement;
      if (surf) {
        this.measureGrid(surf);
      }
    });
  }

  onIconPointerDown(variant: DesktopIconVariant, event: PointerEvent): void {
    if (event.button !== 0) return;
    event.stopPropagation();

    const m = this.gridMetrics();
    if (!m) return;

    const startX = event.clientX;
    const startY = event.clientY;

    const slot = (event.currentTarget as HTMLElement | null) ?? null;
    if (!slot) return;
    const rect = slot.getBoundingClientRect();
    const offsetX = startX - rect.left;
    const offsetY = startY - rect.top;

    let dragStarted = false;
    let ghost: HTMLElement | null = null;

    const onMove = (pe: PointerEvent) => {
      const dx = pe.clientX - startX;
      const dy = pe.clientY - startY;
      if (!dragStarted && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        dragStarted = true;
        this.draggingVariant.set(variant);
        ghost = this.createGhost(variant);
        ghost.style.left = `${startX - offsetX}px`;
        ghost.style.top = `${startY - offsetY}px`;
      }
      if (dragStarted && ghost) {
        ghost.style.left = `${pe.clientX - offsetX}px`;
        ghost.style.top = `${pe.clientY - offsetY}px`;
      }
    };

    const onUp = (pe: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.body.style.userSelect = '';

      if (dragStarted) {
        ghost?.remove();
        this.finalizeDrag(variant, pe.clientX, pe.clientY);
        this.draggingVariant.set(null);
      } else {
        const dist = Math.hypot(pe.clientX - startX, pe.clientY - startY);
        if (dist <= DRAG_THRESHOLD_PX) {
          this.selectedVariant.set(variant);
        }
      }
    };

    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  private createGhost(variant: DesktopIconVariant): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'desktop-icon-ghost';
    const img = document.createElement('img');
    img.className = 'desktop-icon-ghost__img';
    img.src = desktopIconAssetPath(variant);
    img.alt = '';
    img.draggable = false;
    const span = document.createElement('span');
    span.className = 'desktop-icon-ghost__label';
    span.textContent = this.labels[variant];
    wrap.appendChild(img);
    wrap.appendChild(span);
    document.body.appendChild(wrap);
    return wrap;
  }

  private finalizeDrag(
    variant: DesktopIconVariant,
    clientX: number,
    clientY: number,
  ): void {
    const m = this.gridMetrics();
    const surf = this.surface()?.nativeElement;
    if (!m || !surf) return;

    const iconsEl = surf.querySelector('.desktop-icons') as HTMLElement | null;
    if (!iconsEl) return;

    const ir = iconsEl.getBoundingClientRect();
    const relX = clientX - ir.left;
    const relY = clientY - ir.top;

    let col = Math.round(relX / m.cellW);
    let row = Math.round(relY / m.cellH);

    col = Math.max(0, Math.min(m.maxCol, col));
    row = Math.max(0, Math.min(m.maxRow, row));

    if (this.isCellOccupied(row, col, variant)) {
      return;
    }

    this.iconPositions.update((pos) => ({
      ...pos,
      [variant]: { row, col },
    }));

    this.scheduleMeasureGrid();
  }

  private isCellOccupied(
    row: number,
    col: number,
    except: DesktopIconVariant,
  ): boolean {
    const positions = this.iconPositions();
    for (const key of this.variants) {
      if (key === except) continue;
      const p = positions[key];
      if (p.row === row && p.col === col) return true;
    }
    return false;
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    if (this.draggingVariant()) return;
    if (event.button !== 0) return;
    const t = event.target;
    if (!t || !(t instanceof Node)) return;
    const icons = this.host.nativeElement.querySelectorAll('app-desktop-icon');
    for (let i = 0; i < icons.length; i++) {
      if (icons[i].contains(t)) return;
    }
    const osWin = this.host.nativeElement.querySelector('app-os-window');
    if (osWin && osWin.contains(t)) return;
    this.selectedVariant.set(null);
  }
}
