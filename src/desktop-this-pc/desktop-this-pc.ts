import { Component, input, output } from '@angular/core';

import {
  type DesktopIconVariant,
  desktopIconAssetPath,
} from '../shared/desktop-icon/desktop-icon';
import {
  ExplorerDetailsTable,
  type ExplorerDetailsRow,
} from '../shared/explorer-details-table/explorer-details-table';

/** Items shown when opening **Desktop** from inside the This PC window (Details view). */
const DESKTOP_FOLDER_ROWS: readonly ExplorerDetailsRow[] = [
  {
    id: 'this-pc',
    name: 'This PC',
    iconSrc: desktopIconAssetPath('this-pc'),
    dateModified: '4/18/2026 10:00 AM',
    type: 'Shortcut',
    sizeDisplay: '1 KB',
  },
  {
    id: 'resume',
    name: 'Resume',
    iconSrc: desktopIconAssetPath('resume'),
    dateModified: '4/18/2026 10:00 AM',
    type: 'Shortcut',
    sizeDisplay: '2 KB',
  },
  {
    id: 'my-projects',
    name: 'My Projects',
    iconSrc: desktopIconAssetPath('my-projects'),
    dateModified: '4/18/2026 10:00 AM',
    type: 'File folder',
    sizeDisplay: '—',
  },
];

/**
 * Explorer view for the **Desktop** folder opened from This PC (not the full desktop shell).
 */
@Component({
  selector: 'app-desktop-this-pc',
  imports: [ExplorerDetailsTable],
  templateUrl: './desktop-this-pc.html',
  styleUrl: '../shared/explorer-this-pc-pane/explorer-this-pc-pane.scss',
})
export class DesktopThisPc {
  /** Brief flash of the list when the address-bar refresh runs. */
  listRefreshFlash = input(false);

  /** Row double-click — host opens shortcuts or navigates back to This PC. */
  shortcutOpen = output<{ id: DesktopIconVariant }>();

  protected readonly rows = DESKTOP_FOLDER_ROWS;

  protected onRowDoubleClick(row: ExplorerDetailsRow): void {
    const id = row.id as DesktopIconVariant;
    if (id === 'this-pc' || id === 'resume' || id === 'my-projects') {
      this.shortcutOpen.emit({ id });
    }
  }
}
