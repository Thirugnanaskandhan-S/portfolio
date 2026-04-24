import { Component, input, output } from '@angular/core';

import {
  ExplorerDetailsTable,
  type ExplorerDetailsRow,
} from '../shared/explorer-details-table/explorer-details-table';

const PDF_ICON = 'assets/pdf.svg';

const MY_PROJECTS_ROWS: readonly ExplorerDetailsRow[] = [
  {
    id: 'integrator-enterprise-middleware',
    name: 'Integrator - Enterprise Middleware.pdf',
    iconSrc: PDF_ICON,
    dateModified: '4/24/2026 10:00 AM',
    type: 'PDF File',
    sizeDisplay: '—',
  },
  {
    id: 'cactus-ai-powered-knowledge-assistant',
    name: 'Cactus - AI Powered Knowledge Assistant.pdf',
    iconSrc: PDF_ICON,
    dateModified: '4/24/2026 10:00 AM',
    type: 'PDF File',
    sizeDisplay: '—',
  },
  {
    id: 'banking-reconciliation-tool',
    name: 'Banking Reconciliation Tool.pdf',
    iconSrc: PDF_ICON,
    dateModified: '4/24/2026 10:00 AM',
    type: 'PDF File',
    sizeDisplay: '—',
  },
  {
    id: 'superlabels-employee-travel-fuel-expense-tracking-android',
    name: 'Superlabels - Employee Travel & Fuel Expense Tracking (Android).pdf',
    iconSrc: PDF_ICON,
    dateModified: '4/24/2026 10:00 AM',
    type: 'PDF File',
    sizeDisplay: '—',
  },
];

@Component({
  selector: 'app-my-projects-this-pc',
  imports: [ExplorerDetailsTable],
  templateUrl: './my-projects-this-pc.html',
  styleUrl: '../shared/explorer-this-pc-pane/explorer-this-pc-pane.scss',
})
export class MyProjectsThisPc {
  listRefreshFlash = input(false);
  pdfOpen = output<{ id: string }>();

  protected readonly rows = MY_PROJECTS_ROWS;

  protected onRowDoubleClick(row: ExplorerDetailsRow): void {
    if (
      row.id === 'integrator-enterprise-middleware' ||
      row.id === 'cactus-ai-powered-knowledge-assistant' ||
      row.id === 'banking-reconciliation-tool' ||
      row.id === 'superlabels-employee-travel-fuel-expense-tracking-android'
    ) {
      this.pdfOpen.emit({ id: row.id });
    }
  }
}
