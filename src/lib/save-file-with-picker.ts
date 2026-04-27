// =============================================================
// Browser helper: let the user choose where to save a file.
//
// Uses the File System Access API (`showSaveFilePicker`) when
// available — this opens a native "Save as..." dialog so the
// admin can steer the file directly into e.g. a Sedex outbox
// folder. In browsers without the API (Firefox, Safari, older
// Edge), we fall back to a standard anchor-triggered download
// that lands in the browser's default Downloads folder.
//
// The File System Access API is only exposed in secure contexts
// (HTTPS or localhost). In non-secure contexts the check
// silently falls through to the download fallback.
// =============================================================

export type SaveFileResult =
  | { outcome: 'saved'; method: 'picker' | 'fallback' }
  | { outcome: 'cancelled' }

interface SaveFilePickerOptions {
  suggestedName?: string
  types?: Array<{
    description?: string
    accept: Record<string, string[]>
  }>
}

interface FileSystemWritableFileStreamLike {
  write(data: Blob): Promise<void>
  close(): Promise<void>
}

interface FileSystemFileHandleLike {
  createWritable(): Promise<FileSystemWritableFileStreamLike>
}

type ShowSaveFilePickerFn = (
  options?: SaveFilePickerOptions
) => Promise<FileSystemFileHandleLike>

function getShowSaveFilePicker(): ShowSaveFilePickerFn | null {
  if (typeof window === 'undefined') return null
  const fn = (window as unknown as { showSaveFilePicker?: ShowSaveFilePickerFn })
    .showSaveFilePicker
  return typeof fn === 'function' ? fn : null
}

function fallbackDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function saveFileWithPicker(
  blob: Blob,
  suggestedName: string
): Promise<SaveFileResult> {
  const showSaveFilePicker = getShowSaveFilePicker()

  if (!showSaveFilePicker) {
    fallbackDownload(blob, suggestedName)
    return { outcome: 'saved', method: 'fallback' }
  }

  try {
    const handle = await showSaveFilePicker({
      suggestedName,
      types: [
        {
          description: 'XML',
          accept: { 'application/xml': ['.xml'] },
        },
      ],
    })
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    return { outcome: 'saved', method: 'picker' }
  } catch (err) {
    // User pressed Cancel in the native dialog — not an error.
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { outcome: 'cancelled' }
    }
    // Any other failure (e.g. permission denied): fall back so
    // the user at least gets the file in their Downloads folder.
    console.warn('showSaveFilePicker failed, falling back to download:', err)
    fallbackDownload(blob, suggestedName)
    return { outcome: 'saved', method: 'fallback' }
  }
}
