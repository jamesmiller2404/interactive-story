'use client'

import { type ChangeEvent, useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import DOMPurify from 'dompurify'
import { CaptionedImage } from '@/editor/captionedImage'
import { countWords } from '@/utils/countWords'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function useAutoSave(title: string, content: string) {
  const [draftId, setDraftId] = useState<number | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const saveDraft = useCallback(async () => {
    if (!title.trim() && !content.trim()) return

    const startTime = Date.now()
    setSaveStatus('saving')
    try {
      const sanitizedContent = DOMPurify.sanitize(content)
      const payload = { title, content: sanitizedContent, status: 'DRAFT' }
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
      setTimeout(() => setSaveStatus('saved'), delay)
    } catch (error) {
      console.error('Failed to save draft:', error)
      setSaveStatus('error')
    }
  }, [title, content, draftId])

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      saveDraft()
    }, 3000) // Save after 3 seconds of inactivity

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [title, content, saveDraft])



  return { saveStatus }
}

export default function NewArticlePage() {
  const [title, setTitle] = useState('')
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
  const { saveStatus } = useAutoSave(title, content)

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



  return (
    <div className="min-h-screen bg-[var(--app-color-reader-bg)] text-[var(--app-color-reader-text)]">
      <main className="max-w-[var(--app-size-reader-content-max)] mx-auto px-[var(--app-space-reader-x)] py-[var(--app-space-reader-y)] pb-8 font-serif leading-relaxed">
        <header className="mb-[var(--app-space-section)] relative">
          <Link
            href="/"
            className="mb-[var(--app-space-section)] inline-flex rounded-app bg-[var(--app-color-reader-surface)] px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] font-sans text-sm font-medium text-[var(--app-color-reader-text)] transition hover:bg-[var(--app-color-reader-surface-hover)]"
          >
            Dashboard
          </Link>
          {(saveStatus === 'saving' || saveStatus === 'saved') && (
            <div className="absolute top-0 right-0 rounded-app bg-[var(--app-color-reader-surface)] border border-[var(--app-color-reader-border)] px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${saveStatus === 'saved' ? 'bg-green-500' : 'bg-[var(--app-color-accent)]'}`}></div>
              <span className="text-sm text-[var(--app-color-reader-text)]">
                {saveStatus === 'saving' ? 'Saving draft' : 'Draft saved'}
              </span>
            </div>
          )}
          <h1 className="text-4xl font-bold font-sans mb-[var(--app-space-card)] leading-tight">
            New Article
          </h1>
          <div className="[border-bottom:var(--app-border-width)_var(--app-border-style)_var(--app-border-reader)] pb-[var(--app-space-card)] text-sm text-[var(--app-color-reader-muted)]">
            Create a new post
            {saveStatus === 'error' && <span className="ml-4 text-[var(--app-color-error-dark-text)]">Failed to save draft</span>}
          </div>
        </header>



        <div className="space-y-[var(--app-space-stack)]">
          <div>
            <label className="mb-[var(--app-space-label-gap)] block font-sans text-sm font-medium" htmlFor="article-title">
              Post Title
            </label>
            <input
              id="article-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-app [border:var(--app-border-width)_var(--app-border-style)_var(--app-border-reader)] bg-[var(--app-color-reader-surface)] px-[var(--app-space-control-x)] py-[var(--app-space-field-y)] font-sans text-[var(--app-color-reader-text)] outline-none placeholder:text-[var(--app-color-reader-placeholder)] focus:[border-color:var(--app-border-reader-focus)]"
            />
          </div>

          <div>
            <label className="mb-[var(--app-space-label-gap)] block font-sans text-sm font-medium" htmlFor="article-content">
              Post Content
            </label>
            {editor && (
              <div className="mb-2 flex gap-2 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleImageInputChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={`rounded-app px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] font-sans text-sm font-medium ${
                    editor.isActive('bold')
                      ? 'bg-[var(--app-color-accent)] text-[var(--app-color-accent-foreground)]'
                      : 'bg-[var(--app-color-reader-surface)] text-[var(--app-color-reader-text)] hover:bg-[var(--app-color-reader-surface-hover)]'
                  }`}
                >
                  <strong>B</strong>
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={`rounded-app px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] font-sans text-sm font-medium ${
                    editor.isActive('italic')
                      ? 'bg-[var(--app-color-accent)] text-[var(--app-color-accent-foreground)]'
                      : 'bg-[var(--app-color-reader-surface)] text-[var(--app-color-reader-text)] hover:bg-[var(--app-color-reader-surface-hover)]'
                  }`}
                >
                  <em>I</em>
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  className={`rounded-app px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] font-sans text-sm font-medium ${
                    editor.isActive('blockquote')
                      ? 'bg-[var(--app-color-accent)] text-[var(--app-color-accent-foreground)]'
                      : 'bg-[var(--app-color-reader-surface)] text-[var(--app-color-reader-text)] hover:bg-[var(--app-color-reader-surface-hover)]'
                  }`}
                >
                  &ldquo;
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                  className={`rounded-app px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] font-sans text-sm font-medium ${
                    editor.isActive('codeBlock')
                      ? 'bg-[var(--app-color-accent)] text-[var(--app-color-accent-foreground)]'
                      : 'bg-[var(--app-color-reader-surface)] text-[var(--app-color-reader-text)] hover:bg-[var(--app-color-reader-surface-hover)]'
                  }`}
                >
                  &lt;/&gt;
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().setHorizontalRule().run()}
                  className="rounded-app px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] font-sans text-sm font-medium bg-[var(--app-color-reader-surface)] text-[var(--app-color-reader-text)] hover:bg-[var(--app-color-reader-surface-hover)]"
                >
                  ―
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  title={isUploadingImage ? 'Uploading image' : 'Upload image'}
                  className="rounded-app px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] font-sans text-sm font-medium bg-[var(--app-color-reader-surface)] text-[var(--app-color-reader-text)] hover:bg-[var(--app-color-reader-surface-hover)] disabled:opacity-50"
                >
                  🖼️
                </button>
              </div>
            )}
            {imageUploadError && (
              <p className="mb-2 font-sans text-sm text-[var(--app-color-error-dark-text)]">
                {imageUploadError}
              </p>
            )}
            <EditorContent
              editor={editor}
              className="min-h-[var(--app-size-editor-min-height)] w-full rounded-app [border:var(--app-border-width)_var(--app-border-style)_var(--app-border-reader)] bg-[var(--app-color-reader-surface)] px-[var(--app-space-control-x)] py-[var(--app-space-field-y)] text-lg leading-8 text-[var(--app-color-reader-text)] outline-none focus-within:[border-color:var(--app-border-reader-focus)] [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[var(--app-size-editor-min-height)] [&_.ProseMirror]:text-lg [&_.ProseMirror]:leading-8 [&_.ProseMirror]:text-[var(--app-color-reader-text)]"
            />
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-[var(--app-color-reader-surface)] [border-top:var(--app-border-width)_var(--app-border-style)_var(--app-border-reader)] py-1 px-2 text-sm text-[var(--app-color-reader-muted)]">
        <div className="max-w-[var(--app-size-reader-content-max)] mx-auto">
          Word count: {wordCount}
        </div>
      </footer>
    </div>
  )
}
