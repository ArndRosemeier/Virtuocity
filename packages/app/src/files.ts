const FILE_TYPE = { description: 'Virtuocity session', accept: { 'application/json': ['.json'] } };

interface SaveFilePicker {
  showSaveFilePicker(options: { suggestedName: string; types: (typeof FILE_TYPE)[] }): Promise<{
    createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }>;
  }>;
}

const hasSavePicker = (w: Window): w is Window & SaveFilePicker => 'showSaveFilePicker' in w;

/** Saves text to a file, with the browser's file picker where it is available. */
export async function saveTextFile(name: string, text: string): Promise<void> {
  const blob = new Blob([text], { type: 'application/json' });
  if (hasSavePicker(window)) {
    try {
      const handle = await window.showSaveFilePicker({ suggestedName: name, types: [FILE_TYPE] });
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

/** Lets the user pick a file and returns its text, or undefined if they cancel. */
export function openTextFile(): Promise<string | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () =>
      void (input.files?.[0]?.text() ?? Promise.resolve(undefined)).then(resolve);
    input.oncancel = () => resolve(undefined);
    input.click();
  });
}
