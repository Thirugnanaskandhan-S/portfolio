import { Component, input } from '@angular/core';

import {
  ExplorerDetailsTable,
  type ExplorerDetailsRow,
} from '../shared/explorer-details-table/explorer-details-table';

@Component({
  selector: 'app-music-this-pc',
  imports: [ExplorerDetailsTable],
  templateUrl: './music-this-pc.html',
  styleUrl: '../shared/explorer-this-pc-pane/explorer-this-pc-pane.scss',
})
export class MusicThisPc {
  listRefreshFlash = input(false);

  protected readonly rows: readonly ExplorerDetailsRow[] = [];
}
