import { Component, input } from '@angular/core';

import {
  ExplorerDetailsTable,
  type ExplorerDetailsRow,
} from '../shared/explorer-details-table/explorer-details-table';

const FOLDER_ICON = 'assets/folder.png';

/** Stylized root of **Local Disk (C:)** inside This PC. */
const C_DRIVE_ROWS: readonly ExplorerDetailsRow[] = [
  {
    id: 'users',
    name: 'Users',
    iconSrc: FOLDER_ICON,
    dateModified: '4/18/2026 9:00 AM',
    type: 'File folder',
    sizeDisplay: '—',
  },
  {
    id: 'program-files',
    name: 'Program Files',
    iconSrc: FOLDER_ICON,
    dateModified: '4/18/2026 9:00 AM',
    type: 'File folder',
    sizeDisplay: '—',
  },
  {
    id: 'windows',
    name: 'Windows',
    iconSrc: FOLDER_ICON,
    dateModified: '4/18/2026 9:00 AM',
    type: 'File folder',
    sizeDisplay: '—',
  },
];

@Component({
  selector: 'app-c-drive-this-pc',
  imports: [ExplorerDetailsTable],
  templateUrl: './c-drive-this-pc.html',
  styleUrl: '../shared/explorer-this-pc-pane/explorer-this-pc-pane.scss',
})
export class CDriveThisPc {
  listRefreshFlash = input(false);

  protected readonly rows = C_DRIVE_ROWS;
}
