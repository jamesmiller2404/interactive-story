'use client'

import { type ChangeEvent, use, useState, useEffect, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import DOMPurify from 'dompurify'
import EditorToolbar from '@/app/components/EditorToolbar'
import { CaptionedImage } from '@/editor/captionedImage'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

function countWords(text: string): number {
  const plainText = stripHtmlTags(text)
  const words = plainText.trim().split(/\s+/)
  return words.length === 1 && words[0] === '' ? 0 : words.length
}

function useAutoSave(id: number, title: string, subtitle: string, content: string, enabled: boolean) {
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
      const res = await fetch('/api/posts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, title, subtitle, content: sanitizedContent })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
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
  }, [id, title, subtitle, content])

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)

    if (!enabled) {
      hasTrackedInitialStateRef.current = false
      setSaveStatus('idle')
      return
    }

    if (!hasTrackedInitialStateRef.current) {
      hasTrackedInitialStateRef.current = true
      return
    }

    if (!title.trim() && !subtitle.trim() && !content.trim()) {
      setSaveStatus('idle')
      return
    }

    saveVersionRef.current += 1
    timeoutRef.current = setTimeout(() => {
      saveDraft()
    }, 1000)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
    }
  }, [enabled, title, subtitle, content])

  const publishDraft = useCallback(async () => {
    const startTime = Date.now()
    setIsPublishing(true)
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/posts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, title, subtitle, content, status: 'PUBLISHED' })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const elapsed = Date.now() - startTime
      const delay = Math.max(0, 500 - elapsed)
      await new Promise(resolve => setTimeout(resolve, delay))
      setSaveStatus('saved')
      return data
    } catch (error) {
      console.error('Failed to publish draft:', error)
      setSaveStatus('error')
      throw error
    } finally {
      setIsPublishing(false)
    }
  }, [id, title, subtitle, content])

  return { saveStatus, isPublishing, publishDraft }
}

interface Post {
  id: number
  title: string
  subtitle: string | null
  content: string
  status: string
  createdAt: string
  updatedAt: string
}

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [post, setPost] = useState<Post | null>(null)
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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
  const { saveStatus, isPublishing, publishDraft } = useAutoSave(Number(id), title, subtitle, content, !loading)

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
    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/posts/${id}`)
        if (!res.ok) {
          throw new Error('Post not found')
        }
        const data = await res.json()
        if (data.status !== 'DRAFT') {
          throw new Error('Only drafts can be edited')
        }
        setPost(data)
        setTitle(data.title)
        setSubtitle(data.subtitle ?? '')
        setContent(data.content)
        setWordCount(countWords(data.content))
      } catch (error) {
        console.error('Failed to load post:', error)
        setError(error instanceof Error ? error.message : 'Failed to load post')
      } finally {
        setLoading(false)
      }
    }
    fetchPost()
  }, [id])

  useEffect(() => {
    if (editor && post) {
      editor.commands.setContent(post.content)
    }
  }, [editor, post])

  const publishArticle = useCallback(async () => {
    setError('')
    try {
      await publishDraft()
      window.location.href = `/posts/${id}`
    } catch (error) {
      console.error('Failed to publish article:', error)
      setError(error instanceof Error ? error.message : 'Failed to publish article')
    }
  }, [id, publishDraft])

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('post-editor-state-change', {
        detail: {
          saveStatus,
          previewHref: `/posts/${id}`,
          canPublish: Boolean(title.trim() || subtitle.trim() || content.trim()),
          isPublishing,
        },
      })
    )
  }, [id, saveStatus, title, subtitle, content, isPublishing])

  useEffect(() => {
    window.addEventListener('post-editor-publish', publishArticle)
    return () => window.removeEventListener('post-editor-publish', publishArticle)
  }, [publishArticle])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--app-color-reader-bg)] text-[var(--app-color-reader-text)]">
        <div className="max-w-[var(--app-size-reader-content-max)] mx-auto px-[var(--app-space-reader-x)] py-[var(--app-space-reader-y)] font-serif leading-relaxed">
          Loading post...
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-[var(--app-color-reader-bg)] text-[var(--app-color-reader-text)]">
        <div className="max-w-[var(--app-size-reader-content-max)] mx-auto px-[var(--app-space-reader-x)] py-[var(--app-space-reader-y)] font-serif leading-relaxed">
          <h1 className="text-2xl font-bold">{error || 'Post not found'}</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--app-color-reader-bg)] text-[var(--app-color-reader-text)]">
      <div className="sticky top-14 z-30 bg-[var(--app-color-reader-bg)] px-[var(--app-space-reader-x)] py-3 [border-bottom:var(--app-border-width)_var(--app-border-style)_var(--app-border-reader)]">
        <div className="mx-auto max-w-[var(--app-size-reader-content-max)]">
          <EditorToolbar
            editor={editor}
            fileInputRef={fileInputRef}
            isUploadingImage={isUploadingImage}
            onImageInputChange={handleImageInputChange}
          />
        </div>
      </div>

      <main className="flex-1 max-w-[var(--app-size-reader-content-max)] mx-auto px-[var(--app-space-reader-x)] py-[var(--app-space-reader-y)] font-serif leading-relaxed">
        {error && (
          <div className="mb-[var(--app-space-stack)] rounded-app [border:var(--app-border-width)_var(--app-border-style)_var(--app-border-error-dark)] bg-[var(--app-color-error-dark-bg)] p-[var(--app-space-menu-item-x)] font-sans text-sm text-[var(--app-color-error-dark-text)]">
            {error}
          </div>
        )}
        {saveStatus === 'error' && (
          <p className="mb-[var(--app-space-stack)] font-sans text-sm text-[var(--app-color-error-dark-text)]">
            Failed to save draft
          </p>
        )}
        <div className="mb-[var(--app-space-stack)] space-y-1 font-sans text-sm text-[var(--app-color-reader-muted)]">
          <p>Last edited</p>
          <p>Date: {new Date(post.updatedAt).toLocaleDateString()}</p>
          <p>Time: {new Date(post.updatedAt).toLocaleTimeString()}</p>
        </div>

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
                className="edit-input rounded-app [border:var(--app-border-width)_var(--app-border-style)_var(--app-border-reader)] bg-[#020617] px-[var(--app-space-control-x)] py-[var(--app-space-field-y)] font-sans text-4xl font-bold leading-tight text-[var(--app-color-reader-text)] outline-none placeholder:text-[var(--app-color-reader-placeholder)] focus:[border-color:var(--app-border-reader-focus)]"
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
              className="edit-input rounded-app [border:var(--app-border-width)_var(--app-border-style)_var(--app-border-reader)] bg-[#020617] px-[var(--app-space-control-x)] py-[var(--app-space-field-y)] font-sans text-[var(--app-color-reader-placeholder)] outline-none placeholder:text-[var(--app-color-reader-placeholder)] focus:[border-color:var(--app-border-reader-focus)]"
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
                <p className="pointer-events-none absolute left-[var(--app-space-control-x)] top-[var(--app-space-field-y)] z-10 font-sans text-lg text-[var(--app-color-reader-placeholder)]">
                  Content...
                </p>
              )}
              <EditorContent
                editor={editor}
                aria-label="Content"
                className="min-h-[var(--app-size-editor-min-height)] w-full rounded-app [border:var(--app-border-width)_var(--app-border-style)_var(--app-border-reader)] bg-[#020617] px-[var(--app-space-control-x)] py-[var(--app-space-field-y)] text-lg text-[var(--app-color-reader-text)] outline-none focus-within:[border-color:var(--app-border-reader-focus)] [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[var(--app-size-editor-min-height)] [&_.ProseMirror]:text-lg [&_.ProseMirror]:text-[var(--app-color-reader-text)]"
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="sticky bottom-0 bg-[var(--app-color-reader-surface)] [border-top:var(--app-border-width)_var(--app-border-style)_var(--app-border-reader)] py-1 px-2 text-sm text-[var(--app-color-reader-muted)]">
        <div className="max-w-[var(--app-size-reader-content-max)] mx-auto">
          Word count: {wordCount}
        </div>
      </footer>
    </div>
  )
}
