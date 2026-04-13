import { Component, input, model } from '@angular/core';

/** One row under the expandable root (text-only tree; optional › glyph in template). */
export interface ExplorerNavNode {
  readonly id: string;
  readonly label: string;
}

/**
 * Reusable Windows Explorer–style left tree: expandable root + indented children.
 * No icons. Hover on child rows only (root label/chevron have no hover per design).
 */
@Component({
  selector: 'app-explorer-nav-pane',
  imports: [],
  templateUrl: './explorer-nav-pane.html',
  styleUrl: './explorer-nav-pane.scss',
})
export class ExplorerNavPane {
  /** Root row label (e.g. “This PC”). */
  rootLabel = input('This PC');

  /** Id used when the root row is selected. */
  rootId = input('this-pc');

  /** Items shown under the root when expanded. */
  nodes = input.required<readonly ExplorerNavNode[]>();

  /** Stable id for the child `<ul>` (aria-controls); use unique values if multiple panes exist. */
  childListDomId = input('explorer-nav-children');

  /** Branch open/closed. */
  expanded = model(true);

  /** Selected node id (`rootId` or a child `id`). */
  selectedId = model<string>('this-pc');

  protected toggleExpanded(): void {
    this.expanded.update((v) => !v);
  }

  protected select(id: string): void {
    this.selectedId.set(id);
  }

  protected isRootSelected(): boolean {
    return this.selectedId() === this.rootId();
  }

  protected isChildSelected(nodeId: string): boolean {
    return this.selectedId() === nodeId;
  }
}
