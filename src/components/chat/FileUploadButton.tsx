/**
 * FileUploadButton — paperclip icon button that opens a file picker,
 * plus an invisible drag-and-drop zone that activates on the parent container.
 *
 * Usage:
 *   <FileUploadButton onFilesSelected={handleFiles} disabled={sending} />
 *
 * For drag-and-drop, wrap the compose area with <FileDropZone> which renders
 * the visual overlay when files are dragged over.
 */

import { useRef, useState, useCallback } from 'react'
import { Paperclip } from 'lucide-react'
import { useTheme } from '@/lib/theming'
import { validateFile } from '@/services/upload.service'

/* ------------------------------------------------------------------ */
/*  FileUploadButton                                                   */
/* ------------------------------------------------------------------ */

interface FileUploadButtonProps {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
  /** Accepted MIME types for the native picker (empty = all allowed). */
  accept?: string
  className?: string
}

export function FileUploadButton({
  onFilesSelected,
  disabled = false,
  accept,
  className = '',
}: FileUploadButtonProps) {
  const t = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return
    const valid = Array.from(e.target.files).filter((f) => validateFile(f).valid)
    if (valid.length > 0) onFilesSelected(valid)
    // Reset so re-selecting the same file triggers onChange again
    e.target.value = ''
  }

  return (
    <>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className={`p-2 rounded-lg shrink-0 ${t.buttonGhost} disabled:opacity-50 ${className}`}
        title="Attach file"
        aria-label="Attach file"
      >
        <Paperclip className="w-5 h-5" />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  FileDropZone                                                       */
/* ------------------------------------------------------------------ */

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
  children: React.ReactNode
  className?: string
}

/**
 * Wraps its children and shows a drag-and-drop overlay when files are dragged over.
 */
export function FileDropZone({
  onFilesSelected,
  disabled = false,
  children,
  className = '',
}: FileDropZoneProps) {
  const t = useTheme()
  const [dragOver, setDragOver] = useState(false)
  const dragCounterRef = useRef(0)

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (disabled) return
      dragCounterRef.current += 1
      if (dragCounterRef.current === 1) setDragOver(true)
    },
    [disabled]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current -= 1
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0
      setDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      dragCounterRef.current = 0
      setDragOver(false)
      if (disabled) return

      const files = Array.from(e.dataTransfer.files)
      const valid = files.filter((f) => validateFile(f).valid)
      if (valid.length > 0) onFilesSelected(valid)
    },
    [disabled, onFilesSelected]
  )

  return (
    <div
      className={`relative ${className}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {/* Drop overlay */}
      {dragOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-lg pointer-events-none">
          <div className={`px-6 py-4 rounded-xl ${t.card}`}>
            <p className={`text-sm font-medium ${t.textPrimary}`}>
              Drop files to upload
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
