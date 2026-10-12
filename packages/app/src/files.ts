/** A kind of file for the browser's save picker. */
export interface FileType {
  readonly description: string;
  readonly accept: Record<string, string[]>;
}

const JSON_FILE: FileType = {
  description: 'Virtuocity session',
  accept: { 'application/json': ['.json'] },
};

interface SaveFilePicker {
  showSaveFilePicker(options: { suggestedName: string; types: FileType[] }): Promise<{
    createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }>;
  }>;
}

const hasSavePicker = (w: Window): w is Window & SaveFilePicker => 'showSaveFilePicker' in w;

/** Saves a blob to a file, with the browser's file picker where it is available. */
export async function saveFile(name: string, blob: Blob, type: FileType): Promise<void> {
  if (hasSavePicker(window)) {
    try {
      const handle = await window.showSaveFilePicker({ suggestedName: name, types: [type] });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      throw error;
    }
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

/** Saves text to a JSON file, with the browser's file picker where it is available. */
export function saveTextFile(name: string, text: string): Promise<void> {
  return saveFile(name, new Blob([text], { type: 'application/json' }), JSON_FILE);
}

/** Lets the user pick a file and returns it, or undefined if they cancel. */
export function openFile(accept: string): Promise<File | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0]);
    input.oncancel = () => resolve(undefined);
    input.click();
  });
}

/** Lets the user pick a JSON file and returns its text, or undefined if they cancel. */
export async function openTextFile(): Promise<string | undefined> {
  return (await openFile('.json,application/json'))?.text();
}
