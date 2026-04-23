import { Component, input } from '@angular/core';

import {
  ExplorerDetailsTable,
  type ExplorerDetailsRow,
} from '../shared/explorer-details-table/explorer-details-table';

@Component({
  selector: 'app-videos-this-pc',
  imports: [ExplorerDetailsTable],
  templateUrl: './videos-this-pc.html',
  styleUrl: '../shared/explorer-this-pc-pane/explorer-this-pc-pane.scss',
})
export class VideosThisPc {
  listRefreshFlash = input(false);

  protected readonly rows: readonly ExplorerDetailsRow[] = [];
}
