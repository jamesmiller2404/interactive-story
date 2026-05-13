'use client'

import { type ChangeEvent, useState, useEffect, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import DOMPurify from 'dompurify'
import EditorToolbar from '@/app/components/EditorToolbar'
import { CaptionedImage } from '@/editor/captionedImage'
import { countWords } from '@/utils/countWords'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function useAutoSave(title: string, subtitle: string, content: string) {
  const [draftId, setDraftId] = useState<number | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [isPublishing, setIsPublishing] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasTrackedInitialStateRef = useRef(false)
  const saveVersionRef = useRef(0)

  const saveDraft = useCallback(async () => {
    if (!title.trim() && !subtitle.trim() && !content.trim()) {
      setSaveStatus('idle')
      return
    }

    const startTime = Date.now()
    const currentSaveVersion = saveVersionRef.current
    setSaveStatus('saving')
    try {
      const sanitizedContent = DOMPurify.sanitize(content)
      const payload = { title, subtitle, content: sanitizedContent, status: 'DRAFT' }
      let res: Response
      if (draftId) {
        res = await fetch('/api/posts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: draftId, ...payload })
        })
      } else {
        res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDraftId(data.id)
      const elapsed = Date.now() - startTime
      const delay = Math.max(0, 500 - elapsed)
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
      savedTimeoutRef.current = setTimeout(() => {
        if (saveVersionRef.current === currentSaveVersion) {
          setSaveStatus('saved')
        }
      }, delay)
    } catch (error) {
      console.error('Failed to save draft:', error)
      setSaveStatus('error')
    }
  }, [title, subtitle, content, draftId])

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)

    if (!hasTrackedInitialStateRef.current) {
      hasTrackedInitialStateRef.current = true
      return
    }

    if (!title.trim() && !subtitle.trim() && !content.trim()) {
      const idleTimeout = setTimeout(() => setSaveStatus('idle'), 0)
      return () => clearTimeout(idleTimeout)
    }

    saveVersionRef.current += 1
    timeoutRef.current = setTimeout(() => {
      saveDraft()
    }, 1000)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
    }
  }, [title, subtitle, content, saveDraft])



  const publishDraft = useCallback(async () => {
    if (!title.trim() && !subtitle.trim() && !content.trim()) return null

    setIsPublishing(true)
    setSaveStatus('saving')
    try {
      const sanitizedContent = DOMPurify.sanitize(content)
      const payload = { title, subtitle, content: sanitizedContent, status: 'PUBLISHED' }
      const res = await fetch('/api/posts', {
        method: draftId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftId ? { id: draftId, ...payload } : payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDraftId(data.id)
      setSaveStatus('saved')
      return data
    } catch (error) {
      console.error('Failed to publish article:', error)
      setSaveStatus('error')
      throw error
    } finally {
      setIsPublishing(false)
    }
  }, [title, subtitle, content, draftId])

  return { draftId, saveStatus, isPublishing, publishDraft }
}

export default function NewArticlePage() {
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [content, setContent] = useState('')
  const [wordCount, setWordCount] = useState(0)
  const [imageUploadError, setImageUploadError] = useState('')
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const editor = useEditor({
    extensions: [StarterKit, Image, CaptionedImage],
    content: '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      setContent(html)
      setWordCount(countWords(html))
    },
  })
  const { draftId, saveStatus, isPublishing, publishDraft } = useAutoSave(title, subtitle, content)

  const uploadImage = async (file: File) => {
    if (!editor) return

    setImageUploadError('')
    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Image upload failed')

      const description = window.prompt('Add a short description below this image', '')?.trim() ?? ''
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'captionedImage',
          attrs: { src: data.url, alt: description },
          content: description ? [{ type: 'text', text: description }] : [],
        })
        .run()
    } catch (error) {
      console.error('Failed to upload image:', error)
      setImageUploadError(error instanceof Error ? error.message : 'Image upload failed')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleImageInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void uploadImage(file)
  }

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('post-editor-state-change', {
        detail: {
          saveStatus,
          previewHref: draftId ? `/posts/${draftId}` : null,
          canPublish: Boolean(title.trim() || subtitle.trim() || content.trim()),
          isPublishing,
        },
      })
    )
  }, [draftId, saveStatus, title, subtitle, content, isPublishing])

  useEffect(() => {
    const handlePublish = async () => {
      try {
        const publishedPost = await publishDraft()
        if (publishedPost?.id) {
          window.location.href = `/posts/${publishedPost.id}`
        }
      } catch (error) {
        console.error('Failed to publish article:', error)
      }
    }

    window.addEventListener('post-editor-publish', handlePublish)
    return () => window.removeEventListener('post-editor-publish', handlePublish)
  }, [publishDraft])



  return (
    <div className="flex min-h-screen flex-col bg-[var(--app-color-reader-bg)] text-[var(--app-color-reader-text)]">
      <div className="sticky top-14 z-30 bg-[var(--app-color-reader-bg)] px-[var(--app-space-reader-x)] py-3 [border-bottom:var(--app-border-width)_var(--app-border-style)_var(--app-border-reader)]">
        <div className="mx-auto w-full max-w-[var(--app-size-reader-content-max)]">
          <EditorToolbar
            editor={editor}
            fileInputRef={fileInputRef}
            isUploadingImage={isUploadingImage}
            onImageInputChange={handleImageInputChange}
          />
        </div>
      </div>

      <main className="mx-auto w-full max-w-[var(--app-size-reader-content-max)] flex-1 px-[var(--app-space-reader-x)] py-[var(--app-space-reader-y)] pb-8 font-serif leading-relaxed">
        {saveStatus === 'error' && (
          <p className="mb-[var(--app-space-stack)] font-sans text-sm text-[var(--app-color-error-dark-text)]">
            Failed to save draft
          </p>
        )}
        <div className="space-y-[var(--app-space-stack)]">
          <div>
            <h1>
              <input
                id="article-title"
                type="text"
                aria-label="Post Title"
                placeholder="Post Title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-app [border:var(--app-border-width)_var(--app-border-style)_var(--app-border-reader)] bg-[#020617] px-[var(--app-space-control-x)] py-[var(--app-space-field-y)] font-sans text-3xl font-bold leading-tight text-[var(--app-color-reader-text)] outline-none placeholder:text-[var(--app-color-reader-placeholder)] focus:[border-color:var(--app-border-reader-focus)] sm:text-4xl"
              />
            </h1>
          </div>

          <div>
            <input
              id="article-subtitle"
              type="text"
              aria-label="Subtitle"
              placeholder="Subtitle"
              value={subtitle}
              onChange={(event) => setSubtitle(event.target.value)}
              className="w-full rounded-app [border:var(--app-border-width)_var(--app-border-style)_var(--app-border-reader)] bg-[#020617] px-[var(--app-space-control-x)] py-[var(--app-space-field-y)] font-sans text-[var(--app-color-reader-placeholder)] outline-none placeholder:text-[var(--app-color-reader-placeholder)] focus:[border-color:var(--app-border-reader-focus)]"
            />
          </div>

          <div>
            {imageUploadError && (
              <p className="mb-2 font-sans text-sm text-[var(--app-color-error-dark-text)]">
                {imageUploadError}
              </p>
            )}
            <div className="relative">
              {editor?.isEmpty && (
                <p className="pointer-events-none absolute left-[var(--app-space-control-x)] top-[var(--app-space-field-y)] z-10 font-sans text-lg leading-8 text-[var(--app-color-reader-placeholder)]">
                  Content...
                </p>
              )}
              <EditorContent
                editor={editor}
                aria-label="Content"
                className="min-h-[var(--app-size-editor-min-height)] w-full rounded-app [border:var(--app-border-width)_var(--app-border-style)_var(--app-border-reader)] bg-[#020617] px-[var(--app-space-control-x)] py-[var(--app-space-field-y)] text-base leading-7 text-[var(--app-color-reader-text)] outline-none focus-within:[border-color:var(--app-border-reader-focus)] sm:text-lg sm:leading-8 [&_.ProseMirror]:min-h-[var(--app-size-editor-min-height)] [&_.ProseMirror]:text-base [&_.ProseMirror]:leading-7 [&_.ProseMirror]:text-[var(--app-color-reader-text)] [&_.ProseMirror]:outline-none sm:[&_.ProseMirror]:text-lg sm:[&_.ProseMirror]:leading-8"
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="sticky bottom-0 bg-[var(--app-color-reader-surface)] [border-top:var(--app-border-width)_var(--app-border-style)_var(--app-border-reader)] py-1 px-2 text-sm text-[var(--app-color-reader-muted)]">
        <div className="mx-auto w-full max-w-[var(--app-size-reader-content-max)]">
          Word count: {wordCount}
        </div>
      </footer>
    </div>
  )
}
