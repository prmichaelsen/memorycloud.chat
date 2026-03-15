/**
 * UploadProgress — displays a list of in-progress, completed, and failed uploads
 * with progress bars, file names, status badges, and remove/retry actions.
 */

import { X, RotateCcw } from 'lucide-react'
import { useTheme } from '@/lib/theming'
import { formatFileSize, isImageType, type UploadProgress as UploadProgressType } from '@/services/upload.service'

interface UploadProgressListProps {
  uploads: UploadProgressType[]
  onRemove: (fileKey: string) => void
  onRetry?: (fileKey: string) => void
}

/**
 * Renders a compact list of upload entries above the compose input.
 */
export function UploadProgressList({
  uploads,
  onRemove,
  onRetry,
}: UploadProgressListProps) {
  const t = useTheme()

  if (uploads.length === 0) return null

  return (
    <div className="px-4 pt-3 flex flex-wrap gap-2">
      {uploads.map((upload) => (
        <UploadProgressChip
          key={upload.file_key}
          upload={upload}
          onRemove={() => onRemove(upload.file_key)}
          onRetry={onRetry ? () => onRetry(upload.file_key) : undefined}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Single chip                                                        */
/* ------------------------------------------------------------------ */

interface UploadProgressChipProps {
  upload: UploadProgressType
  onRemove: () => void
  onRetry?: () => void
}

function UploadProgressChip({ upload, onRemove, onRetry }: UploadProgressChipProps) {
  const t = useTheme()

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${t.elevated}`}
    >
      {/* File name */}
      <span className={`truncate max-w-[120px] ${t.textSecondary}`}>
        {upload.file_name}
      </span>

      {/* Status indicator */}
      {upload.status === 'pending' && (
        <span className={`text-xs ${t.textMuted}`}>Waiting...</span>
      )}
      {upload.status === 'uploading' && (
        <div className="flex items-center gap-1.5">
          <div className="w-16 h-1.5 rounded-full bg-black/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-primary transition-all duration-300"
              style={{ width: `${upload.progress}%` }}
            />
          </div>
          <span className={`text-xs ${t.textMuted}`}>{upload.progress}%</span>
        </div>
      )}
      {upload.status === 'complete' && (
        <span className={`text-xs ${t.badgeSuccess} px-1 rounded`}>Done</span>
      )}
      {upload.status === 'error' && (
        <span
          className={`text-xs ${t.badgeDanger} px-1 rounded`}
          title={upload.error}
        >
          Error
        </span>
      )}

      {/* Retry button (errors only) */}
      {upload.status === 'error' && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={`p-0.5 rounded ${t.buttonGhost}`}
          title="Retry upload"
          aria-label="Retry upload"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      )}

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className={`p-0.5 rounded ${t.buttonGhost}`}
        title="Remove"
        aria-label="Remove upload"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Detailed progress bar (alternative layout for larger displays)     */
/* ------------------------------------------------------------------ */

interface UploadProgressBarProps {
  upload: UploadProgressType
  onRemove?: () => void
}

/**
 * A wider progress bar variant with more detail, suitable for modals or panels.
 */
export function UploadProgressBar({ upload, onRemove }: UploadProgressBarProps) {
  const t = useTheme()

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg ${t.elevated}`}>
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${t.textPrimary}`}>{upload.file_name}</p>

        {upload.status === 'uploading' && (
          <div className="mt-1 h-1.5 rounded-full bg-black/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-primary transition-all duration-300"
              style={{ width: `${upload.progress}%` }}
            />
          </div>
        )}

        {upload.status === 'error' && (
          <p className="text-xs text-brand-danger mt-0.5">{upload.error}</p>
        )}

        {upload.status === 'complete' && (
          <p className={`text-xs ${t.badgeSuccess}`}>Uploaded</p>
        )}
      </div>

      {upload.status === 'uploading' && (
        <span className={`text-xs shrink-0 ${t.textMuted}`}>{upload.progress}%</span>
      )}

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={`p-0.5 rounded ${t.buttonGhost}`}
          aria-label="Remove upload"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
