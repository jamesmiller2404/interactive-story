'use client'

import { use, useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

function countWords(text: string): number {
  const plainText = stripHtmlTags(text)
  const words = plainText.trim().split(/\s+/)
  return words.length === 1 && words[0] === '' ? 0 : words.length
}

function useAutoSave(id: number, title: string, content: string) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const saveDraft = useCallback(async () => {
    if (!title.trim() && !content.trim()) return

    const startTime = Date.now()
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/posts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, title, content })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const elapsed = Date.now() - startTime
      const delay = Math.max(0, 500 - elapsed)
      setTimeout(() => setSaveStatus('saved'), delay)
    } catch (error) {
      console.error('Failed to save draft:', error)
      setSaveStatus('error')
    }
  }, [id, title, content])

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      saveDraft()
    }, 3000) // Save after 3 seconds of inactivity

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [title, content, saveDraft])

  const publishDraft = useCallback(async () => {
    const startTime = Date.now()
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/posts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'PUBLISHED' })
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
    }
  }, [id])

  return { saveStatus, publishDraft }
}

interface Post {
  id: number
  title: string
  content: string
  status: string
  createdAt: string
  updatedAt: string
}

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [post, setPost] = useState<Post | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [wordCount, setWordCount] = useState(0)
  const { saveStatus, publishDraft } = useAutoSave(Number(id), title, content)

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

  const publishArticle = async () => {
    setError('')
    try {
      await publishDraft()
      window.location.href = `/posts/${id}`
    } catch (error) {
      console.error('Failed to publish article:', error)
      setError(error instanceof Error ? error.message : 'Failed to publish article')
    }
  }

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
      <main className="flex-1 max-w-[var(--app-size-reader-content-max)] mx-auto px-[var(--app-space-reader-x)] py-[var(--app-space-reader-y)] pb-16 font-serif leading-relaxed">
        <header className="mb-[var(--app-space-section)] relative">
          <div className="mb-[var(--app-space-section)] flex gap-2">
            <Link
              href="/"
              className="inline-flex rounded-app bg-[var(--app-color-reader-surface)] px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] font-sans text-sm font-medium text-[var(--app-color-reader-text)] transition hover:bg-[var(--app-color-reader-surface-hover)]"
            >
              Dashboard
            </Link>
            <Link
              href={`/posts/${id}`}
              className="inline-flex rounded-app bg-[var(--app-color-reader-surface)] px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] font-sans text-sm font-medium text-[var(--app-color-reader-text)] transition hover:bg-[var(--app-color-reader-surface-hover)]"
            >
              Preview Post
            </Link>
          </div>
          {(saveStatus === 'saving' || saveStatus === 'saved') && (
            <div className="absolute top-0 right-0 rounded-app bg-[var(--app-color-reader-surface)] border border-[var(--app-color-reader-border)] px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${saveStatus === 'saved' ? 'bg-green-500' : 'bg-[var(--app-color-accent)]'}`}></div>
              <span className="text-sm text-[var(--app-color-reader-text)]">
                {saveStatus === 'saving' ? 'Saving draft' : 'Draft saved'}
              </span>
            </div>
          )}
          <h1 className="text-4xl font-bold font-sans mb-[var(--app-space-card)] leading-tight">
            Edit Draft
          </h1>
          <div className="[border-bottom:var(--app-border-width)_var(--app-border-style)_var(--app-border-reader)] pb-[var(--app-space-card)] text-sm text-[var(--app-color-reader-muted)]">
            Edit your draft post
            {saveStatus === 'error' && <span className="ml-4 text-[var(--app-color-error-dark-text)]">Failed to save draft</span>}
          </div>
        </header>

        {error && (
          <div className="mb-[var(--app-space-stack)] rounded-app [border:var(--app-border-width)_var(--app-border-style)_var(--app-border-error-dark)] bg-[var(--app-color-error-dark-bg)] p-[var(--app-space-menu-item-x)] font-sans text-sm text-[var(--app-color-error-dark-text)]">
            {error}
          </div>
        )}

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
            <div className="mb-[var(--app-space-label-gap)] flex gap-2">
              <button
                type="button"
                onClick={() => document.execCommand('bold')}
                className="rounded-app bg-[var(--app-color-reader-surface)] px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] font-sans text-sm font-medium text-[var(--app-color-reader-text)] hover:bg-[var(--app-color-reader-surface-hover)]"
              >
                <strong>B</strong>
              </button>
              <button
                type="button"
                onClick={() => document.execCommand('italic')}
                className="rounded-app bg-[var(--app-color-reader-surface)] px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] font-sans text-sm font-medium text-[var(--app-color-reader-text)] hover:bg-[var(--app-color-reader-surface-hover)]"
              >
                <em>I</em>
              </button>
            </div>
            <div
              id="article-content"
              contentEditable
              dangerouslySetInnerHTML={{ __html: content }}
              onInput={(event) => {
                setContent(event.currentTarget.innerHTML)
                setWordCount(countWords(event.currentTarget.innerHTML))
              }}
              className="min-h-[var(--app-size-editor-min-height)] w-full rounded-app [border:var(--app-border-width)_var(--app-border-style)_var(--app-border-reader)] bg-[var(--app-color-reader-surface)] px-[var(--app-space-control-x)] py-[var(--app-space-field-y)] text-lg leading-8 text-[var(--app-color-reader-text)] outline-none placeholder:text-[var(--app-color-reader-placeholder)] focus:[border-color:var(--app-border-reader-focus)]"
            />
          </div>

          <button
            type="button"
            onClick={publishArticle}
            className="rounded-app bg-blue-600 px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] font-sans text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Publish
          </button>
        </div>
      </main>
      <footer className="fixed bottom-0 left-0 right-0 bg-[var(--app-color-reader-surface)] border-t border-[var(--app-border-reader)] px-[var(--app-space-reader-x)] py-[var(--app-space-control-y)] text-sm text-[var(--app-color-reader-muted)] z-10">
        <div className="max-w-[var(--app-size-reader-content-max)] mx-auto">
          Word count: {wordCount}
        </div>
      </footer>


    </div>
  )
}