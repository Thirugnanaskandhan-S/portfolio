import { Component, computed, effect, input, output, signal } from '@angular/core';

import { CDriveThisPc } from '../c-drive-this-pc/c-drive-this-pc';
import { DesktopThisPc } from '../desktop-this-pc/desktop-this-pc';
import { DocumentsThisPc } from '../documents-this-pc/documents-this-pc';
import { MusicThisPc } from '../music-this-pc/music-this-pc';
import { MyProjectsThisPc } from '../my-projects-this-pc/my-projects-this-pc';
import { PicturesThisPc } from '../pictures-this-pc/pictures-this-pc';
import { VideosThisPc } from '../videos-this-pc/videos-this-pc';
import { type DesktopIconVariant } from '../shared/desktop-icon/desktop-icon';
import {
  ExplorerNavPane,
  type ExplorerNavNode,
} from '../shared/explorer-nav-pane/explorer-nav-pane';
import {
  THIS_PC_C_DRIVE_WINDOW_LABEL,
  type ThisPcMainView,
  isThisPcSubView,
} from './this-pc-main-view';

const FOLDER_ICON = 'assets/folder.png';
const C_DRIVE_TILE_ICON = 'assets/c-drive.png';

interface FolderTile {
  readonly id: string;
  readonly label: string;
}

interface DriveTile {
  readonly id: string;
  readonly label: string;
  /** Tile image; template falls back to the generic folder icon when omitted. */
  readonly iconSrc?: string;
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
    label: THIS_PC_C_DRIVE_WINDOW_LABEL,
    iconSrc: C_DRIVE_TILE_ICON,
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
  { id: 'c-drive', label: THIS_PC_C_DRIVE_WINDOW_LABEL },
];

@Component({
  selector: 'app-this-pc',
  imports: [
    CDriveThisPc,
    DesktopThisPc,
    DocumentsThisPc,
    ExplorerNavPane,
    MusicThisPc,
    MyProjectsThisPc,
    PicturesThisPc,
    VideosThisPc,
  ],
  templateUrl: './this-pc.html',
  styleUrl: './this-pc.scss',
})
export class ThisPc {
  /** Explorer search — filters folder and drive tiles by label. */
  searchQuery = input('');

  /** Brief flash of the main pane (address-bar refresh). */
  listRefreshFlash = input(false);

  /** Main pane: This PC home vs. a library / drive opened from Folders, Drives, or nav. */
  mainView = input<ThisPcMainView>('root');

  /** User opened a folder from the Folders grid or chose **Desktop** in the nav pane. */
  folderEnter = output<{ folderId: string }>();

  /** User chose the **This PC** root in the nav pane or host navigated up. */
  navigateToRoot = output<void>();

  /** Double-click a shortcut inside the in-window Desktop folder. */
  desktopShortcutOpen = output<{ id: DesktopIconVariant }>();
  /** Double-click a PDF inside the in-window My Projects folder. */
  myProjectsPdfOpen = output<{ id: string }>();

  protected readonly navNodes = THIS_PC_NAV_NODES;
  protected readonly thisPcNavExpanded = signal(true);
  protected readonly selectedNavId = signal<string>('this-pc');

  protected readonly foldersOpen = signal(true);
  protected readonly drivesOpen = signal(true);

  protected readonly folderIconSrc = FOLDER_ICON;

  #prevMainView: ThisPcMainView = 'root';

  constructor() {
    effect(() => {
      const cur = this.mainView();
      if (cur === 'my-projects') {
        this.selectedNavId.set('desktop');
      } else if (cur !== 'root') {
        this.selectedNavId.set(cur);
      }
      if (this.#prevMainView !== 'root' && cur === 'root') {
        this.selectedNavId.set('this-pc');
      }
      this.#prevMainView = cur;
    });
  }

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

  protected onNavSelected(id: string): void {
    this.selectedNavId.set(id);
    if (id === 'this-pc') {
      this.navigateToRoot.emit();
      return;
    }
    if (id === 'c-drive') {
      this.folderEnter.emit({ folderId: 'c-drive' });
      return;
    }
    if (isThisPcSubView(id)) {
      this.folderEnter.emit({ folderId: id });
    }
  }

  protected onFolderTileDblClick(f: FolderTile, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!isThisPcSubView(f.id)) return;
    this.selectedNavId.set(f.id);
    this.folderEnter.emit({ folderId: f.id });
  }

  protected onDriveTileDblClick(d: DriveTile, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (d.id !== 'c') return;
    this.selectedNavId.set('c-drive');
    this.folderEnter.emit({ folderId: 'c-drive' });
  }
}
