import { Component, input, output } from '@angular/core';

/** One row for the Explorer-style details grid (icon + name, date, type, size). */
export interface ExplorerDetailsRow {
  readonly id: string;
  readonly name: string;
  readonly iconSrc: string;
  readonly dateModified: string;
  readonly type: string;
  /** Size column text; omit or empty to show an em dash. */
  readonly sizeDisplay?: string;
}

/**
 * Reusable dark “Details” table: Name (with icon), Date Modified, Type, Size.
 * Emits on row double-click for host actions (e.g. open file).
 */
@Component({
  selector: 'app-explorer-details-table',
  imports: [],
  templateUrl: './explorer-details-table.html',
  styleUrl: './explorer-details-table.scss',
})
export class ExplorerDetailsTable {
  /** `role="grid"` label. */
  ariaLabel = input('Details');

  rows = input.required<readonly ExplorerDetailsRow[]>();

  /** Brief opacity flash (e.g. address-bar refresh). */
  refreshFlash = input(false);

  emptyMessage = input('No items match your search.');

  colName = input('Name');
  colDateModified = input('Date Modified');
  colType = input('Type');
  colSize = input('Size');

  rowDoubleClick = output<ExplorerDetailsRow>();

  protected onRowDblClick(row: ExplorerDetailsRow, event: MouseEvent): void {
    event.preventDefault();
    this.rowDoubleClick.emit(row);
  }

  protected sizeCell(row: ExplorerDetailsRow): string {
    const s = row.sizeDisplay;
    return s != null && s !== '' ? s : '—';
  }
}
