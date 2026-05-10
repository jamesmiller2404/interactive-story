'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'

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
      const payload = { title, content, status: 'DRAFT' }
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
  const { saveStatus } = useAutoSave(title, content)



  return (
    <div className="min-h-screen bg-[var(--app-color-reader-bg)] text-[var(--app-color-reader-text)]">
      <main className="max-w-[var(--app-size-reader-content-max)] mx-auto px-[var(--app-space-reader-x)] py-[var(--app-space-reader-y)] font-serif leading-relaxed">
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
            <textarea
              id="article-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="min-h-[var(--app-size-editor-min-height)] w-full rounded-app [border:var(--app-border-width)_var(--app-border-style)_var(--app-border-reader)] bg-[var(--app-color-reader-surface)] px-[var(--app-space-control-x)] py-[var(--app-space-field-y)] text-lg leading-8 text-[var(--app-color-reader-text)] outline-none placeholder:text-[var(--app-color-reader-placeholder)] focus:[border-color:var(--app-border-reader-focus)]"
            />
          </div>
        </div>
      </main>
    </div>
  )
}
