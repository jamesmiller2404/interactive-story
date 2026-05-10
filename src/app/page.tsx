'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import Link from 'next/link'

interface Chapter {
  id: number
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

const DEFAULT_CHAPTER_PREVIEW_WORD_LIMIT = 30
const CHAPTER_PREVIEW_WORD_LIMIT_KEY = 'chapterPreviewWordLimit'
const CHAPTER_PREVIEW_WORD_LIMIT_EVENT = 'chapter-preview-word-limit-change'

function getStoredChapterPreviewWordLimit() {
  if (typeof window === 'undefined') {
    return DEFAULT_CHAPTER_PREVIEW_WORD_LIMIT
  }

  const storedValue = Number(window.localStorage.getItem(CHAPTER_PREVIEW_WORD_LIMIT_KEY))

  if (!Number.isFinite(storedValue) || storedValue < 1) {
    return DEFAULT_CHAPTER_PREVIEW_WORD_LIMIT
  }

  return Math.floor(storedValue)
}

function subscribeToChapterPreviewWordLimit(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  window.addEventListener('storage', callback)
  window.addEventListener(CHAPTER_PREVIEW_WORD_LIMIT_EVENT, callback)

  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(CHAPTER_PREVIEW_WORD_LIMIT_EVENT, callback)
  }
}

function saveChapterPreviewWordLimit(wordLimit: number) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(CHAPTER_PREVIEW_WORD_LIMIT_KEY, String(wordLimit))
  window.dispatchEvent(new Event(CHAPTER_PREVIEW_WORD_LIMIT_EVENT))
}

function limitWords(text: string, wordLimit: number) {
  const words = text.trim().split(/\s+/)

  if (words.length <= wordLimit) {
    return text
  }

  return `${words.slice(0, wordLimit).join(' ')}...`
}

export default function Home() {
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [error, setError] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const chapterPreviewWordLimit = useSyncExternalStore(
    subscribeToChapterPreviewWordLimit,
    getStoredChapterPreviewWordLimit,
    () => DEFAULT_CHAPTER_PREVIEW_WORD_LIMIT
  )

  const fetchChapters = async () => {
    try {
      const res = await fetch('/api/chapters')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to load chapters')
      }

      if (!Array.isArray(data)) {
        throw new Error('Chapter API returned an invalid response')
      }

      setChapters(data)
      setError('')
    } catch (error) {
      console.error('Failed to load chapters:', error)
      setChapters([])
      setError(error instanceof Error ? error.message : 'Failed to load chapters')
    }
  }

  useEffect(() => {
    fetchChapters()
  }, [])

  return (
    <div className="flex min-h-screen bg-[#161718] text-[#eeeeee]">
      <aside className="flex w-64 shrink-0 flex-col border-r border-[#2e2f30] bg-[#131414] p-6">
        <h2 className="text-lg font-semibold">Dashboard</h2>
        <div className="relative mt-6">
          <button
            type="button"
            onClick={() => setCreateMenuOpen((open) => !open)}
            className="flex w-full items-center justify-between rounded-app bg-[#b25c33] px-4 py-2 text-sm font-medium text-white hover:bg-[#c7683b]"
            aria-expanded={createMenuOpen}
            aria-haspopup="menu"
          >
            <span>Create a Post</span>
            <span
              aria-hidden="true"
              className="h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-white"
            />
          </button>

          {createMenuOpen && (
            <div
              className="absolute left-0 z-10 mt-2 w-full rounded-app border border-[#323334] bg-[#1b1c1d] p-1 shadow-xl"
              role="menu"
            >
              <Link
                href="/chapters/new"
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-app px-3 py-2 text-sm text-[#eeeeee] hover:bg-[#2e2f30]"
                role="menuitem"
              >
                Article
              </Link>
              <button
                type="button"
                className="block w-full rounded-app px-3 py-2 text-left text-sm text-[#a5a8ad] hover:bg-[#2e2f30]"
                role="menuitem"
              >
                Note
              </button>
            </div>
          )}
        </div>

        <nav className="mt-auto">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="text-sm text-[#eeeeee] underline-offset-4 hover:underline"
          >
            Settings
          </button>
        </nav>
      </aside>

      <main className="flex-1 bg-[#161718] p-8 text-[#eeeeee]">
        <div className="max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Interactive Story Reader</h1>
          </div>

          {error && (
            <div className="mb-6 rounded-app border border-red-300 bg-red-50 p-3 text-red-800">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {chapters.map((chapter) => (
              <div key={chapter.id} className="rounded-app border border-[#323334] bg-[#1b1c1d] p-4">
                <Link href={`/chapters/${chapter.id}`}>
                  <h3 className="text-xl font-semibold mb-2 hover:text-blue-400 cursor-pointer">{chapter.title}</h3>
                </Link>
                <p className="whitespace-pre-wrap">
                  {limitWords(chapter.content, chapterPreviewWordLimit)}
                </p>
                <p className="text-sm text-[#a5a8ad] mt-2">
                  Created: {new Date(chapter.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
        >
          <div className="w-full max-w-md rounded-app border border-[#2e2f30] bg-[#131414] p-6 text-[#eeeeee] shadow-xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 id="settings-title" className="text-xl font-semibold">
                Settings
              </h2>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-2xl leading-none text-[#eeeeee] hover:bg-[#2e2f30]"
                aria-label="Close settings"
              >
                &times;
              </button>
            </div>
            <label className="block text-sm font-medium text-[#eeeeee]" htmlFor="chapter-preview-word-limit">
              Chapter preview word limit
            </label>
            <input
              id="chapter-preview-word-limit"
              type="number"
              min="1"
              value={chapterPreviewWordLimit}
              onChange={(e) => {
                const nextLimit = Number(e.target.value)
                saveChapterPreviewWordLimit(Number.isFinite(nextLimit) && nextLimit > 0 ? Math.floor(nextLimit) : 1)
              }}
              className="mt-2 w-full rounded-app border border-[#2e2f30] bg-[#161718] p-2 text-[#eeeeee]"
            />
          </div>
        </div>
      )}
    </div>
  )
}
