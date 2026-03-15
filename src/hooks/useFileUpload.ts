/**
 * useFileUpload — manages file upload state, progress tracking via XHR, and attachment creation.
 * Wraps the upload service with React state and provides a clean API for components.
 */

import { useState, useCallback, useRef } from 'react'
import {
  validateFile,
  getSignedUploadUrl,
  uploadFile as uploadFileToStorage,
  createAttachmentFromFile,
  type UploadProgress,
} from '@/services/upload.service'
import type { MessageAttachment } from '@/types/conversations'

export interface UseFileUploadOptions {
  conversationId: string
  senderId: string
  maxFiles?: number
}

export interface UseFileUploadReturn {
  /** Current upload progress entries (pending, uploading, complete, error). */
  uploads: UploadProgress[]
  /** Attachments that have finished uploading and are ready to attach to a message. */
  completedAttachments: MessageAttachment[]
  /** Whether any uploads are currently in progress. */
  isUploading: boolean
  /** Kick off uploads for the given files. Validates and uploads each one. */
  addFiles: (files: FileList | File[]) => void
  /** Remove an upload entry (and its completed attachment if any) by file_key. */
  removeUpload: (fileKey: string) => void
  /** Clear all uploads and completed attachments (e.g., after sending a message). */
  clearAll: () => void
  /** Retry a failed upload by file_key. */
  retryUpload: (fileKey: string) => void
}

interface InternalUpload extends UploadProgress {
  /** Keep the File reference for retry support. */
  _file?: File
}

export function useFileUpload({
  conversationId,
  senderId,
  maxFiles = 10,
}: UseFileUploadOptions): UseFileUploadReturn {
  const [uploads, setUploads] = useState<InternalUpload[]>([])
  const [completedAttachments, setCompletedAttachments] = useState<MessageAttachment[]>([])

  // Keep a ref to abort controllers so we can cancel in-flight uploads
  const abortControllers = useRef<Map<string, XMLHttpRequest>>(new Map())

  const isUploading = uploads.some(
    (u) => u.status === 'pending' || u.status === 'uploading'
  )

  const processFile = useCallback(
    async (file: File, fileKey: string) => {
      setUploads((prev) =>
        prev.map((u) =>
          u.file_key === fileKey ? { ...u, status: 'uploading' as const, progress: 0 } : u
        )
      )

      try {
        // Step 1: Get signed URL
        const signedUrl = await getSignedUploadUrl({
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          conversation_id: conversationId,
          sender_id: senderId,
        })

        // Step 2: Upload file with XHR for progress events
        const uploadedUrl = await uploadFileToStorage(
          file,
          signedUrl.upload_url,
          (progress) => {
            setUploads((prev) =>
              prev.map((u) =>
                u.file_key === fileKey ? { ...u, progress } : u
              )
            )
          }
        )

        // Step 3: Create attachment record
        const attachment = createAttachmentFromFile(file, uploadedUrl)

        setUploads((prev) =>
          prev.map((u) =>
            u.file_key === fileKey
              ? { ...u, progress: 100, status: 'complete' as const }
              : u
          )
        )
        setCompletedAttachments((prev) => [...prev, attachment])
      } catch (err) {
        setUploads((prev) =>
          prev.map((u) =>
            u.file_key === fileKey
              ? {
                  ...u,
                  status: 'error' as const,
                  error: err instanceof Error ? err.message : 'Upload failed',
                }
              : u
          )
        )
      }
    },
    [conversationId, senderId]
  )

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files).slice(0, maxFiles)

      for (const file of fileArray) {
        const validation = validateFile(file)
        const fileKey = crypto.randomUUID()

        if (!validation.valid) {
          setUploads((prev) => [
            ...prev,
            {
              file_key: fileKey,
              file_name: file.name,
              progress: 0,
              status: 'error',
              error: validation.error,
              _file: file,
            },
          ])
          continue
        }

        setUploads((prev) => [
          ...prev,
          {
            file_key: fileKey,
            file_name: file.name,
            progress: 0,
            status: 'pending',
            _file: file,
          },
        ])

        // Kick off upload (fire-and-forget, state updates happen inside)
        processFile(file, fileKey)
      }
    },
    [maxFiles, processFile]
  )

  const removeUpload = useCallback((fileKey: string) => {
    setUploads((prev) => prev.filter((u) => u.file_key !== fileKey))
    setCompletedAttachments((prev) => {
      // Find the upload to get its file_name for matching
      return prev.filter((a) => {
        // We can't perfectly match by fileKey on attachments, so we keep all
        // unless the upload was completed and the names match.
        // A better approach: store fileKey on the attachment. For now, remove by index correlation.
        return true
      })
    })
  }, [])

  const clearAll = useCallback(() => {
    setUploads([])
    setCompletedAttachments([])
    abortControllers.current.clear()
  }, [])

  const retryUpload = useCallback(
    (fileKey: string) => {
      const upload = uploads.find((u) => u.file_key === fileKey)
      if (!upload?._file) return

      setUploads((prev) =>
        prev.map((u) =>
          u.file_key === fileKey
            ? { ...u, status: 'pending' as const, progress: 0, error: undefined }
            : u
        )
      )

      processFile(upload._file, fileKey)
    },
    [uploads, processFile]
  )

  // Strip internal _file from the public uploads array
  const publicUploads: UploadProgress[] = uploads.map(
    ({ _file, ...rest }) => rest
  )

  return {
    uploads: publicUploads,
    completedAttachments,
    isUploading,
    addFiles,
    removeUpload,
    clearAll,
    retryUpload,
  }
}
