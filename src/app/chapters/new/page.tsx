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
    <div className="min-h-screen bg-[#020617] text-[#e2e4ec]">
      <main className="max-w-2xl mx-auto px-4 py-12 font-serif leading-relaxed">
        <header className="mb-8">
          <Link
            href="/"
            className="mb-8 inline-flex rounded-app bg-[#111525] px-4 py-2 font-sans text-sm font-medium text-[#e2e4ec] transition hover:bg-[#1b2136]"
          >
            Dashboard
          </Link>
          <h1 className="text-4xl font-bold font-sans mb-4 leading-tight">
            New Article
          </h1>
          <div className="border-b border-slate-700 pb-4 text-sm text-slate-300">
            Create a new post
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-app border border-red-400 bg-red-950/50 p-3 font-sans text-sm text-red-100">
            {error}
          </div>
        )}

        <form onSubmit={createArticle} className="space-y-6">
          <div>
            <label className="mb-2 block font-sans text-sm font-medium" htmlFor="article-title">
              Chapter Title
            </label>
            <input
              id="article-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-app border border-slate-700 bg-[#111525] px-4 py-3 font-sans text-[#e2e4ec] outline-none placeholder:text-slate-500 focus:border-slate-400"
              required
            />
          </div>

          <div>
            <label className="mb-2 block font-sans text-sm font-medium" htmlFor="article-content">
              Chapter Content
            </label>
            <textarea
              id="article-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="min-h-96 w-full rounded-app border border-slate-700 bg-[#111525] px-4 py-3 text-lg leading-8 text-[#e2e4ec] outline-none placeholder:text-slate-500 focus:border-slate-400"
              required
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-app bg-[#111525] px-4 py-2 font-sans text-sm font-medium text-[#e2e4ec] transition hover:bg-[#1b2136] disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Article'}
          </button>
        </form>
      </main>
    </div>
  )
}
