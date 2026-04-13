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
import { ExplorerCommandBar } from '../shared/explorer-command-bar/explorer-command-bar';
import { OsWindow } from '../shared/os-window/os-window';
import { Taskbar, type DarkModeChangeDetail, type TaskbarTaskItem } from '../shared/taskbar/taskbar';
import { ThisPc } from '../this-pc/this-pc';

const RESUME_PDF_SRC = 'assets/Resume.pdf';

/** Relative to `<base href>` — must match `index.html` / taskbar theme. */
const DESKTOP_WALLPAPER_DAY = 'url(assets/windows-xp-day.png)';
const DESKTOP_WALLPAPER_NIGHT = 'url(assets/windows-xp-night.png)';

/** Window chrome + taskbar label for the in-app PDF viewer (app name — file name). */
const PDF_VIEWER_TITLE = 'File Engine - Resume.pdf';

const THIS_PC_WINDOW_TITLE = 'This PC';
const THIS_PC_TITLE_ICON = 'assets/this-pc.png';

const DRAG_THRESHOLD_PX = 5;
/** Below this size, marquee mouseup is treated as a click (clear selection). */
const MARQUEE_CLICK_MAX_PX = 4;

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
  imports: [DesktopIcon, ExplorerCommandBar, OsWindow, Taskbar, ThisPc],
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

  protected readonly selectedVariants = signal<DesktopIconVariant[]>([]);
  protected readonly draggingVariants = signal<DesktopIconVariant[]>([]);

  /** Rubber-band rect in `.desktop-icons` coordinates (px). */
  protected readonly marqueeRect = signal<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);

  protected readonly marqueeBox = computed(() => {
    const r = this.marqueeRect();
    if (!r) return null;
    const left = Math.min(r.x1, r.x2);
    const top = Math.min(r.y1, r.y2);
    const width = Math.abs(r.x2 - r.x1);
    const height = Math.abs(r.y2 - r.y1);
    return { left, top, width, height };
  });

  /** In-app PDF viewer (File Engine; not a browser tab). */
  protected readonly resumeWindow = signal<{
    open: boolean;
    minimized: boolean;
    maximized: boolean;
  }>({ open: false, minimized: false, maximized: false });

  /** This PC explorer window. */
  protected readonly thisPcWindow = signal<{
    open: boolean;
    minimized: boolean;
    maximized: boolean;
  }>({ open: false, minimized: false, maximized: false });

  protected readonly resumePdfSrc = RESUME_PDF_SRC;

  protected readonly pdfViewerTitle = PDF_VIEWER_TITLE;

  protected readonly thisPcWindowTitle = THIS_PC_WINDOW_TITLE;

  protected readonly thisPcTitleIcon = THIS_PC_TITLE_ICON;

  /** Filters rows in the This PC window (explorer search box). */
  protected readonly thisPcSearchQuery = signal('');

  /** Short flash of the This PC list when refresh is clicked. */
  protected readonly thisPcListRefreshFlash = signal(false);

  private thisPcRefreshFlashTimer: ReturnType<typeof setTimeout> | null = null;

  /** Open windows mirrored on the taskbar (Start-adjacent). */
  protected readonly taskbarTasks = computed((): TaskbarTaskItem[] => {
    const tasks: TaskbarTaskItem[] = [];
    const pc = this.thisPcWindow();
    if (pc.open) {
      tasks.push({
        id: 'this-pc',
        title: THIS_PC_WINDOW_TITLE,
        iconSrc: desktopIconAssetPath('this-pc'),
        minimized: pc.minimized,
      });
    }
    const w = this.resumeWindow();
    if (w.open) {
      tasks.push({
        id: 'resume',
        title: PDF_VIEWER_TITLE,
        iconSrc: desktopIconAssetPath('resume'),
        minimized: w.minimized,
      });
    }
    return tasks;
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
    if (this.thisPcRefreshFlashTimer !== null) {
      clearTimeout(this.thisPcRefreshFlashTimer);
      this.thisPcRefreshFlashTimer = null;
    }
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
    this.selectedVariants.set([v]);
  }

  /** Empty desktop-icons area: rubber-band selection. */
  protected onDesktopIconsPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    if (!isPlatformBrowser(this.platformId)) return;
    const el = event.target as Element | null;
    if (el?.closest('.desktop-icon-slot')) return;

    const surf = this.surface()?.nativeElement;
    const iconsEl = surf?.querySelector('.desktop-icons') as HTMLElement | undefined;
    if (!iconsEl) return;

    event.preventDefault();
    const ir = iconsEl.getBoundingClientRect();
    const x0 = event.clientX - ir.left;
    const y0 = event.clientY - ir.top;
    this.marqueeRect.set({ x1: x0, y1: y0, x2: x0, y2: y0 });

    const onMove = (pe: PointerEvent) => {
      const x = pe.clientX - ir.left;
      const y = pe.clientY - ir.top;
      this.marqueeRect.update((cur) => (cur ? { ...cur, x2: x, y2: y } : cur));
    };

    const onUp = (pe: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.body.style.userSelect = '';
      try {
        iconsEl.releasePointerCapture(pe.pointerId);
      } catch {
        /* ignore */
      }
      this.endMarqueeSelection();
    };

    document.body.style.userSelect = 'none';
    try {
      iconsEl.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  private endMarqueeSelection(): void {
    const box = this.marqueeBox();
    this.marqueeRect.set(null);
    if (!box) return;
    if (box.width < MARQUEE_CLICK_MAX_PX && box.height < MARQUEE_CLICK_MAX_PX) {
      this.selectedVariants.set([]);
      return;
    }
    const m = this.gridMetrics();
    if (!m) return;
    const picked = this.variants.filter((v) => this.iconIntersectsMarqueeBox(v, box, m));
    this.selectedVariants.set(picked);
  }

  private iconIntersectsMarqueeBox(
    v: DesktopIconVariant,
    box: { left: number; top: number; width: number; height: number },
    m: { iconW: number; iconH: number },
  ): boolean {
    const left = this.iconLeft(v);
    const top = this.iconTop(v);
    const iw = m.iconW;
    const ih = m.iconH;
    return !(
      left + iw < box.left ||
      left > box.left + box.width ||
      top + ih < box.top ||
      top > box.top + box.height
    );
  }

  protected onSlotDblClick(v: DesktopIconVariant, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (v === 'this-pc') {
      this.thisPcWindow.update((s) => ({
        open: true,
        minimized: false,
        maximized: s.maximized,
      }));
      return;
    }
    if (v === 'resume') {
      this.resumeWindow.update((s) => ({
        open: true,
        minimized: false,
        maximized: s.maximized,
      }));
    }
  }

  protected onThisPcRefreshClick(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.thisPcRefreshFlashTimer !== null) {
      clearTimeout(this.thisPcRefreshFlashTimer);
      this.thisPcRefreshFlashTimer = null;
    }
    this.thisPcListRefreshFlash.set(true);
    this.thisPcRefreshFlashTimer = setTimeout(() => {
      this.thisPcListRefreshFlash.set(false);
      this.thisPcRefreshFlashTimer = null;
    }, 45);
  }

  protected closeThisPcWindow(): void {
    this.thisPcSearchQuery.set('');
    this.thisPcWindow.set({ open: false, minimized: false, maximized: false });
  }

  protected minimizeThisPcWindow(): void {
    this.thisPcWindow.update((s) => ({ ...s, minimized: true }));
  }

  protected toggleThisPcMaximize(): void {
    this.thisPcWindow.update((s) => ({ ...s, maximized: !s.maximized }));
  }

  protected restoreThisPcWindow(): void {
    this.thisPcWindow.update((s) => ({ ...s, minimized: false }));
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
    if (id === 'this-pc') {
      const w = this.thisPcWindow();
      if (w.minimized) this.restoreThisPcWindow();
      else this.minimizeThisPcWindow();
      return;
    }
    if (id === 'resume') {
      const w = this.resumeWindow();
      if (w.minimized) this.restoreResumeWindow();
      else this.minimizeResumeWindow();
    }
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

    const sel = this.selectedVariants();
    const moveGroup: DesktopIconVariant[] =
      sel.length > 1 && sel.includes(variant) ? [...sel] : [variant];

    const startX = event.clientX;
    const startY = event.clientY;

    const slot = (event.currentTarget as HTMLElement | null) ?? null;
    if (!slot) return;

    const initialRects = new Map<DesktopIconVariant, DOMRect>();
    for (const v of moveGroup) {
      const slotEl = this.host.nativeElement.querySelector(
        `[data-desktop-variant="${CSS.escape(v)}"]`,
      ) as HTMLElement | null;
      if (slotEl) initialRects.set(v, slotEl.getBoundingClientRect());
    }
    if (!initialRects.has(variant)) return;

    let dragStarted = false;
    const ghosts: HTMLElement[] = [];

    const onMove = (pe: PointerEvent) => {
      const dx = pe.clientX - startX;
      const dy = pe.clientY - startY;
      if (!dragStarted && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        dragStarted = true;
        this.draggingVariants.set(moveGroup);
        for (const v of moveGroup) {
          const r = initialRects.get(v);
          if (!r) continue;
          const g = this.createGhost(v);
          ghosts.push(g);
          g.style.left = `${r.left}px`;
          g.style.top = `${r.top}px`;
        }
      }
      if (dragStarted) {
        for (let i = 0; i < moveGroup.length; i++) {
          const v = moveGroup[i];
          const r = initialRects.get(v);
          const g = ghosts[i];
          if (!r || !g) continue;
          g.style.left = `${r.left + dx}px`;
          g.style.top = `${r.top + dy}px`;
        }
      }
    };

    const onUp = (pe: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.body.style.userSelect = '';

      if (dragStarted) {
        for (const g of ghosts) {
          g.remove();
        }
        this.finalizeDragGroup(variant, moveGroup, pe.clientX, pe.clientY);
        this.draggingVariants.set([]);
      } else {
        const dist = Math.hypot(pe.clientX - startX, pe.clientY - startY);
        if (dist <= DRAG_THRESHOLD_PX) {
          this.selectedVariants.set([variant]);
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

  private finalizeDragGroup(
    primary: DesktopIconVariant,
    group: DesktopIconVariant[],
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

    const positions = this.iconPositions();
    const oldPrimary = positions[primary];
    const dr = row - oldPrimary.row;
    const dc = col - oldPrimary.col;

    if (dr === 0 && dc === 0) return;

    if (!this.canMoveGroup(group, dr, dc)) return;

    this.iconPositions.update((pos) => {
      const next = { ...pos };
      for (const v of group) {
        const p = pos[v];
        next[v] = { row: p.row + dr, col: p.col + dc };
      }
      return next;
    });

    this.scheduleMeasureGrid();
  }

  private canMoveGroup(group: DesktopIconVariant[], dr: number, dc: number): boolean {
    const m = this.gridMetrics();
    if (!m) return false;
    const positions = this.iconPositions();
    const selectedSet = new Set(group);
    const targets = new Map<string, DesktopIconVariant>();

    for (const v of group) {
      const p = positions[v];
      const tr = p.row + dr;
      const tc = p.col + dc;
      if (tr < 0 || tr > m.maxRow || tc < 0 || tc > m.maxCol) return false;
      const key = `${tr},${tc}`;
      if (targets.has(key)) return false;
      targets.set(key, v);
    }

    for (const v of this.variants) {
      if (selectedSet.has(v)) continue;
      const p = positions[v];
      if (targets.has(`${p.row},${p.col}`)) return false;
    }
    return true;
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    if (this.draggingVariants().length > 0) return;
    if (event.button !== 0) return;
    const t = event.target;
    if (!t || !(t instanceof Node)) return;
    const host = this.host.nativeElement;
    const icons = host.querySelectorAll('app-desktop-icon');
    for (let i = 0; i < icons.length; i++) {
      if (icons[i].contains(t)) return;
    }
    const osWin = host.querySelector('app-os-window');
    if (osWin && osWin.contains(t)) return;
    const taskbar = host.querySelector('app-taskbar');
    if (taskbar && taskbar.contains(t)) return;
    const iconsArea = host.querySelector('.desktop-icons');
    if (
      iconsArea?.contains(t) &&
      t instanceof Element &&
      !t.closest('.desktop-icon-slot')
    ) {
      return;
    }
    this.selectedVariants.set([]);
  }
}
