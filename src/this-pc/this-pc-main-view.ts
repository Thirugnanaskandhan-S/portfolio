/** In-window Explorer location for {@link ThisPc} (not the shell desktop). */
export type ThisPcMainView =
  | 'root'
  | 'desktop'
  | 'my-projects'
  | 'documents'
  | 'pictures'
  | 'music'
  | 'videos'
  | 'c-drive';

const SUBVIEWS = new Set<Exclude<ThisPcMainView, 'root'>>([
  'desktop',
  'my-projects',
  'documents',
  'pictures',
  'music',
  'videos',
  'c-drive',
]);

export function isThisPcSubView(value: string): value is Exclude<ThisPcMainView, 'root'> {
  return SUBVIEWS.has(value as Exclude<ThisPcMainView, 'root'>);
}

/** Window chrome + address bar for **C:** (matches nav / drive tile copy). */
export const THIS_PC_C_DRIVE_WINDOW_LABEL = "Thiru's Brain Capacity (C:)";

/** Address field text when not on the This PC home page. */
export const THIS_PC_MAIN_VIEW_ADDRESS: Record<Exclude<ThisPcMainView, 'root'>, string> = {
  desktop: 'Desktop',
  'my-projects': 'My Projects',
  documents: 'Documents',
  pictures: 'Pictures',
  music: 'Music',
  videos: 'Videos',
  'c-drive': THIS_PC_C_DRIVE_WINDOW_LABEL,
};
