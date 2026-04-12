import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

/** India Standard Time (IST) — same offset year-round. */
const IST_TIME_ZONE = 'Asia/Kolkata';

/** Open window shown as a taskbar button (Start-adjacent, like Windows). */
export interface TaskbarTaskItem {
  id: string;
  title: string;
  iconSrc: string;
  /** True when the window is minimized (muted styling). */
  minimized: boolean;
}

/** Viewport center of the theme toggle — used as radial reveal origin. */
export interface DarkModeChangeDetail {
  checked: boolean;
  originX: number;
  originY: number;
}

@Component({
  selector: 'app-taskbar',
  imports: [],
  templateUrl: './taskbar.html',
  styleUrl: './taskbar.scss',
})
export class Taskbar {
  /** Open in-app windows to mirror in the taskbar. */
  tasks = input<TaskbarTaskItem[]>([]);

  /** Emits the task {@link TaskbarTaskItem.id} when its button is activated. */
  taskActivate = output<string>();

  /** Night wallpaper on + viewport origin of toggle for radial reveal. */
  darkModeChange = output<DarkModeChangeDetail>();

  protected readonly clockTime = signal('');
  protected readonly clockDate = signal('');

  readonly #destroyRef = inject(DestroyRef);
  readonly #timeFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  readonly #dateFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  constructor() {
    this.#tick();
    interval(1000)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#tick());
  }

  #tick(): void {
    const now = new Date();
    this.clockTime.set(this.#timeFmt.format(now));
    this.clockDate.set(this.#dateFmt.format(now).replace(/\//g, '-'));
  }

  onThemeToggle(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const rect = input.getBoundingClientRect();
    this.darkModeChange.emit({
      checked: input.checked,
      originX: rect.left + rect.width / 2,
      originY: rect.top + rect.height / 2,
    });
  }
}
