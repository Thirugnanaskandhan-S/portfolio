import { Component, input } from '@angular/core';

import {
  ExplorerDetailsTable,
  type ExplorerDetailsRow,
} from '../shared/explorer-details-table/explorer-details-table';

@Component({
  selector: 'app-documents-this-pc',
  imports: [ExplorerDetailsTable],
  templateUrl: './documents-this-pc.html',
  styleUrl: '../shared/explorer-this-pc-pane/explorer-this-pc-pane.scss',
})
export class DocumentsThisPc {
  listRefreshFlash = input(false);

  protected readonly rows: readonly ExplorerDetailsRow[] = [];
}
