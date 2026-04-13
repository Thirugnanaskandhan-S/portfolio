import { Component, computed, input, signal } from '@angular/core';

import {
  ExplorerNavPane,
  type ExplorerNavNode,
} from '../shared/explorer-nav-pane/explorer-nav-pane';

const FOLDER_ICON = 'assets/folder.png';

interface FolderTile {
  readonly id: string;
  readonly label: string;
}

interface DriveTile {
  readonly id: string;
  readonly label: string;
  readonly freeGb: number;
  /** Used for the usage bar when `usageBarPercent` is not set. */
  readonly totalGb: number;
  /** Optional label for free space instead of `"{freeGb} GB"`. */
  readonly freeDisplay?: string;
  /** Optional label for total capacity instead of `"{totalGb} GB"`. */
  readonly totalDisplay?: string;
  /**
   * Bar fill as % used (0–100). Use when the displayed total does not match `totalGb`
   * (e.g. huge capacity shown in text but `totalGb` is only for legacy math).
   */
  readonly usageBarPercent?: number;
  readonly barVariant: 'critical' | 'ok';
}

const FOLDER_TILES: readonly FolderTile[] = [
  { id: 'desktop', label: 'Desktop' },
  { id: 'documents', label: 'Documents' },
  { id: 'downloads', label: 'Downloads' },
  { id: 'music', label: 'Music' },
  { id: 'pictures', label: 'Pictures' },
  { id: 'videos', label: 'Videos' },
];

const DRIVE_TILES: readonly DriveTile[] = [
  {
    id: 'c',
    label: "Thiru's Brain Capacity (C:)",
    freeGb: 17.6,
    totalGb: 237,
    freeDisplay: 'Skills / 0',
    totalDisplay: '∞ TB',
    usageBarPercent: 1.5,
    barVariant: 'ok',
  },
];

/** Left navigation (same scope as folder shortcuts). */
const THIS_PC_NAV_NODES: readonly ExplorerNavNode[] = [
  { id: 'desktop', label: 'Desktop' },
  { id: 'documents', label: 'Documents' },
  { id: 'pictures', label: 'Pictures' },
  { id: 'music', label: 'Music' },
  { id: 'videos', label: 'Videos' },
  { id: 'c-drive', label: "Thiru's Brain Capacity (C:)" },
];

@Component({
  selector: 'app-this-pc',
  imports: [ExplorerNavPane],
  templateUrl: './this-pc.html',
  styleUrl: './this-pc.scss',
})
export class ThisPc {
  /** Explorer search — filters folder and drive tiles by label. */
  searchQuery = input('');

  /** Brief flash of the main pane (address-bar refresh). */
  listRefreshFlash = input(false);

  protected readonly navNodes = THIS_PC_NAV_NODES;
  protected readonly thisPcNavExpanded = signal(true);
  protected readonly selectedNavId = signal<string>('this-pc');

  protected readonly foldersOpen = signal(true);
  protected readonly drivesOpen = signal(true);

  protected readonly folderIconSrc = FOLDER_ICON;

  protected readonly filteredFolders = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return [...FOLDER_TILES];
    return FOLDER_TILES.filter((f) => f.label.toLowerCase().includes(q));
  });

  protected readonly filteredDrives = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return [...DRIVE_TILES];
    return DRIVE_TILES.filter((d) => d.label.toLowerCase().includes(q));
  });

  protected readonly folderSectionCount = computed(() => this.filteredFolders().length);
  protected readonly drivesSectionCount = computed(() => this.filteredDrives().length);

  protected toggleFolders(): void {
    this.foldersOpen.update((v) => !v);
  }

  protected toggleDrives(): void {
    this.drivesOpen.update((v) => !v);
  }

  protected usedPercent(d: DriveTile): number {
    if (d.usageBarPercent != null) {
      return Math.min(100, Math.max(0, d.usageBarPercent));
    }
    const used = d.totalGb - d.freeGb;
    return Math.min(100, Math.max(0, (used / d.totalGb) * 100));
  }

  protected formatDriveSubtitle(d: DriveTile): string {
    const freePart = d.freeDisplay ?? `${d.freeGb} GB`;
    const totalPart = d.totalDisplay ?? `${d.totalGb} GB`;
    return `${freePart} free of ${totalPart}`;
  }
}
