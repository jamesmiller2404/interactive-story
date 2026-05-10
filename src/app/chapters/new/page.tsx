'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function NewArticlePage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const createArticle = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to create article')
      }

      window.location.href = `/chapters/${data.id}`
    } catch (error) {
      console.error('Failed to create article:', error)
      setError(error instanceof Error ? error.message : 'Failed to create article')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--app-color-reader-bg)] text-[var(--app-color-reader-text)]">
      <main className="max-w-[var(--app-size-reader-content-max)] mx-auto px-[var(--app-space-reader-x)] py-[var(--app-space-reader-y)] font-serif leading-relaxed">
        <header className="mb-[var(--app-space-section)]">
          <Link
            href="/"
            className="mb-[var(--app-space-section)] inline-flex rounded-app bg-[var(--app-color-reader-surface)] px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] font-sans text-sm font-medium text-[var(--app-color-reader-text)] transition hover:bg-[var(--app-color-reader-surface-hover)]"
          >
            Dashboard
          </Link>
          <h1 className="text-4xl font-bold font-sans mb-[var(--app-space-card)] leading-tight">
            New Article
          </h1>
          <div className="border-b border-[var(--app-color-reader-border)] pb-[var(--app-space-card)] text-sm text-[var(--app-color-reader-muted)]">
            Create a new post
          </div>
        </header>

        {error && (
          <div className="mb-[var(--app-space-stack)] rounded-app border border-[var(--app-color-error-dark-border)] bg-[var(--app-color-error-dark-bg)] p-[var(--app-space-menu-item-x)] font-sans text-sm text-[var(--app-color-error-dark-text)]">
            {error}
          </div>
        )}

        <form onSubmit={createArticle} className="space-y-[var(--app-space-stack)]">
          <div>
            <label className="mb-[var(--app-space-label-gap)] block font-sans text-sm font-medium" htmlFor="article-title">
              Chapter Title
            </label>
            <input
              id="article-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-app border border-[var(--app-color-reader-border)] bg-[var(--app-color-reader-surface)] px-[var(--app-space-control-x)] py-[var(--app-space-field-y)] font-sans text-[var(--app-color-reader-text)] outline-none placeholder:text-[var(--app-color-reader-placeholder)] focus:border-[var(--app-color-reader-focus)]"
              required
            />
          </div>

          <div>
            <label className="mb-[var(--app-space-label-gap)] block font-sans text-sm font-medium" htmlFor="article-content">
              Chapter Content
            </label>
            <textarea
              id="article-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="min-h-[var(--app-size-editor-min-height)] w-full rounded-app border border-[var(--app-color-reader-border)] bg-[var(--app-color-reader-surface)] px-[var(--app-space-control-x)] py-[var(--app-space-field-y)] text-lg leading-8 text-[var(--app-color-reader-text)] outline-none placeholder:text-[var(--app-color-reader-placeholder)] focus:border-[var(--app-color-reader-focus)]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-app bg-[var(--app-color-reader-surface)] px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] font-sans text-sm font-medium text-[var(--app-color-reader-text)] transition hover:bg-[var(--app-color-reader-surface-hover)] disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Article'}
          </button>
        </form>
      </main>
    </div>
  )
}
