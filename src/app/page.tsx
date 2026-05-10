'use client'

import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
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
  const createButtonRef = useRef<HTMLButtonElement>(null)
  const createMenuRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        createMenuOpen &&
        createButtonRef.current &&
        createMenuRef.current &&
        !createButtonRef.current.contains(event.target as Node) &&
        !createMenuRef.current.contains(event.target as Node)
      ) {
        setCreateMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [createMenuOpen])

  return (
    <div className="flex min-h-screen bg-[var(--app-color-dashboard-bg)] text-[var(--app-color-text-primary)]">
      <aside className="flex w-[var(--app-size-sidebar-width)] shrink-0 flex-col [border-right:var(--app-border-width)_var(--app-border-style)_var(--app-border-dashboard)] bg-[var(--app-color-dashboard-surface)] p-[var(--app-space-sidebar)]">
        <h2 className="text-lg font-semibold">Dashboard</h2>
        <div className="relative mt-[var(--app-space-stack)]">
          <button
            ref={createButtonRef}
            type="button"
            onClick={() => setCreateMenuOpen((open) => !open)}
            className="flex w-full items-center justify-between rounded-app bg-[var(--app-color-accent)] px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] text-sm font-medium text-[var(--app-color-accent-foreground)] hover:bg-[var(--app-color-accent-hover)]"
            aria-expanded={createMenuOpen}
            aria-haspopup="menu"
          >
            <span>Create a Post</span>
            <span
              aria-hidden="true"
              className="h-0 w-0 [border-left:var(--app-border-caret-width)_solid_transparent] [border-right:var(--app-border-caret-width)_solid_transparent] [border-top:var(--app-border-caret-width)_solid_var(--app-color-accent-foreground)]"
            />
          </button>

          {createMenuOpen && (
            <div
              ref={createMenuRef}
              className="absolute left-0 z-10 mt-[var(--app-space-menu-offset)] w-full rounded-app [border:var(--app-border-width)_var(--app-border-style)_var(--app-border-dashboard-panel)] bg-[var(--app-color-dashboard-panel)] p-[var(--app-space-menu)] shadow-xl"
              role="menu"
            >
              <Link
                href="/chapters/new"
                className="block rounded-app px-[var(--app-space-menu-item-x)] py-[var(--app-space-menu-item-y)] text-sm text-[var(--app-color-text-primary)] hover:bg-[var(--app-color-dashboard-border)]"
                role="menuitem"
              >
                Article
              </Link>
              <button
                type="button"
                className="block w-full rounded-app px-[var(--app-space-menu-item-x)] py-[var(--app-space-menu-item-y)] text-left text-sm text-[var(--app-color-text-muted)] hover:bg-[var(--app-color-dashboard-border)]"
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
            className="text-sm text-[var(--app-color-text-primary)] underline-offset-4 hover:underline"
          >
            Settings
          </button>
        </nav>
      </aside>

      <main className="flex-1 bg-[var(--app-color-dashboard-bg)] p-[var(--app-space-dashboard-page)] text-[var(--app-color-text-primary)]">
        <div className="max-w-[var(--app-size-dashboard-content-max)]">
          <div className="mb-[var(--app-space-section)]">
            <h1 className="text-3xl font-bold">Interactive Story Reader</h1>
          </div>

          {error && (
            <div className="mb-[var(--app-space-stack)] rounded-app [border:var(--app-border-width)_var(--app-border-style)_var(--app-border-error)] bg-[var(--app-color-error-bg)] p-[var(--app-space-menu-item-x)] text-[var(--app-color-error-text)]">
              {error}
            </div>
          )}

          <div className="space-y-[var(--app-space-stack)]">
            {chapters.map((chapter) => (
              <div key={chapter.id} className="rounded-app [border:var(--app-border-width)_var(--app-border-style)_var(--app-border-dashboard-panel)] bg-[var(--app-color-dashboard-panel)] p-[var(--app-space-card)]">
                <Link href={`/chapters/${chapter.id}`}>
                  <h3 className="text-xl font-semibold mb-[var(--app-space-label-gap)] hover:text-[var(--app-color-link-hover)] cursor-pointer">{chapter.title}</h3>
                </Link>
                <p className="whitespace-pre-wrap">
                  {limitWords(chapter.content, chapterPreviewWordLimit)}
                </p>
                <p className="text-sm text-[var(--app-color-text-muted)] mt-[var(--app-space-label-gap)]">
                  Created: {new Date(chapter.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-color-overlay-scrim)] p-[var(--app-space-overlay)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
        >
          <div className="w-full max-w-[var(--app-size-modal-max)] rounded-app [border:var(--app-border-width)_var(--app-border-style)_var(--app-border-dashboard)] bg-[var(--app-color-dashboard-surface)] p-[var(--app-space-modal)] text-[var(--app-color-text-primary)] shadow-xl">
            <div className="mb-[var(--app-space-stack)] flex items-center justify-between gap-[var(--app-space-card)]">
              <h2 id="settings-title" className="text-xl font-semibold">
                Settings
              </h2>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-2xl leading-none text-[var(--app-color-text-primary)] hover:bg-[var(--app-color-dashboard-border)]"
                aria-label="Close settings"
              >
                &times;
              </button>
            </div>
            <label className="block text-sm font-medium text-[var(--app-color-text-primary)]" htmlFor="chapter-preview-word-limit">
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
              className="mt-[var(--app-space-label-gap)] w-full rounded-app [border:var(--app-border-width)_var(--app-border-style)_var(--app-border-dashboard)] bg-[var(--app-color-dashboard-bg)] p-[var(--app-space-control-y)] text-[var(--app-color-text-primary)]"
            />
          </div>
        </div>
      )}
    </div>
  )
}
