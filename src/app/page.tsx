'use client'

import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import Link from 'next/link'

interface Post {
  id: number
  title: string
  subtitle: string | null
  content: string
  status: string
  createdAt: string
  updatedAt: string
}

const DEFAULT_POST_PREVIEW_WORD_LIMIT = 30
const POST_PREVIEW_WORD_LIMIT_KEY = 'postPreviewWordLimit'
const POST_PREVIEW_WORD_LIMIT_EVENT = 'post-preview-word-limit-change'

function getStoredPostPreviewWordLimit() {
  if (typeof window === 'undefined') {
    return DEFAULT_POST_PREVIEW_WORD_LIMIT
  }

  const storedValue = Number(window.localStorage.getItem(POST_PREVIEW_WORD_LIMIT_KEY))

  if (!Number.isFinite(storedValue) || storedValue < 1) {
    return DEFAULT_POST_PREVIEW_WORD_LIMIT
  }

  return Math.floor(storedValue)
}

function subscribeToPostPreviewWordLimit(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  window.addEventListener('storage', callback)
  window.addEventListener(POST_PREVIEW_WORD_LIMIT_EVENT, callback)

  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(POST_PREVIEW_WORD_LIMIT_EVENT, callback)
  }
}

function savePostPreviewWordLimit(wordLimit: number) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(POST_PREVIEW_WORD_LIMIT_KEY, String(wordLimit))
  window.dispatchEvent(new Event(POST_PREVIEW_WORD_LIMIT_EVENT))
}

function limitHtmlWords(html: string, wordLimit: number): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  let wordCount = 0

  function walk(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || ''
      const words = text.trim().split(/\s+/)
      if (words.length === 0 || words[0] === '') return true
      if (wordCount + words.length <= wordLimit) {
        wordCount += words.length
        return true
      } else {
        const remaining = wordLimit - wordCount
        node.textContent = words.slice(0, remaining).join(' ') + (remaining < words.length ? '...' : '')
        return false
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const children = Array.from(node.childNodes)
      for (const child of children) {
        if (!walk(child)) {
          // Remove following siblings and their content
          let sibling = child.nextSibling
          while (sibling) {
            const next = sibling.nextSibling
            sibling.parentNode?.removeChild(sibling)
            sibling = next
          }
          return false
        }
      }
      return true
    }
    return true
  }

  walk(doc.body)
  return doc.body.innerHTML
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([])
  const [error, setError] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [postToDelete, setPostToDelete] = useState<Post | null>(null)
  const createButtonRef = useRef<HTMLButtonElement>(null)
  const createMenuRef = useRef<HTMLDivElement>(null)
  const postPreviewWordLimit = useSyncExternalStore(
    subscribeToPostPreviewWordLimit,
    getStoredPostPreviewWordLimit,
    () => DEFAULT_POST_PREVIEW_WORD_LIMIT
  )

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch('/api/posts')
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error ?? 'Failed to load posts')
        }

        if (!Array.isArray(data)) {
          throw new Error('Post API returned an invalid response')
        }

        setPosts(data)
        setError('')
      } catch (error) {
        console.error('Failed to load posts:', error)
        setPosts([])
        setError(error instanceof Error ? error.message : 'Failed to load posts')
      }
    }

    fetchPosts()
  }, [])

  const deletePost = async (post: Post) => {
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to delete post')
      }

      setPosts((prevPosts) => prevPosts.filter((p) => p.id !== post.id))
      setDeleteConfirmOpen(false)
      setPostToDelete(null)
      setError('')
    } catch (error) {
      console.error('Failed to delete post:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete post')
      setDeleteConfirmOpen(false)
      setPostToDelete(null)
    }
  }

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
            className="flex w-full items-center justify-between rounded-app-button bg-[var(--app-color-accent)] px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] text-sm font-medium text-[var(--app-color-accent-foreground)] hover:bg-[var(--app-color-accent-hover)]"
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
              className="absolute left-0 z-10 mt-[var(--app-space-menu-offset)] w-full rounded-app-card [border:var(--app-border-width)_var(--app-border-style)_var(--app-border-dashboard-panel)] bg-[var(--app-color-dashboard-panel)] p-[var(--app-space-menu)] shadow-xl"
              role="menu"
            >
              <Link
                href="/posts/new"
                className="block rounded-app-button px-[var(--app-space-menu-item-x)] py-[var(--app-space-menu-item-y)] text-sm text-[var(--app-color-text-primary)] hover:bg-[var(--app-color-dashboard-border)]"
                role="menuitem"
              >
                Article
              </Link>
              <button
                type="button"
                className="block w-full rounded-app-button px-[var(--app-space-menu-item-x)] py-[var(--app-space-menu-item-y)] text-left text-sm text-[var(--app-color-text-muted)] hover:bg-[var(--app-color-dashboard-border)]"
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
            <div className="mb-[var(--app-space-stack)] rounded-app-card [border:var(--app-border-width)_var(--app-border-style)_var(--app-border-error)] bg-[var(--app-color-error-bg)] p-[var(--app-space-menu-item-x)] text-[var(--app-color-error-text)]">
              {error}
            </div>
          )}

          <div className="space-y-[var(--app-space-stack)]">
            {posts.map((post) => (
              <div key={post.id} className="rounded-app-card [border:var(--app-border-width)_var(--app-border-style)_var(--app-border-dashboard-panel)] bg-[var(--app-color-dashboard-panel)] p-[var(--app-space-card)]">
                <div className="flex items-center justify-between mb-[var(--app-space-label-gap)]">
                  <div className="flex items-center gap-2">
                    <Link href={post.status === 'DRAFT' ? `/posts/${post.id}/edit` : `/posts/${post.id}`}>
                      <h3 className="text-xl font-semibold hover:text-[var(--app-color-link-hover)] cursor-pointer">{post.title}</h3>
                    </Link>
                    {post.status === 'DRAFT' && (
                      <Link
                        href={`/posts/${post.id}/edit`}
                        className="flex h-6 w-6 items-center justify-center rounded-app-button bg-[var(--app-color-accent)] text-xs font-medium text-[var(--app-color-accent-foreground)] hover:bg-[var(--app-color-accent-hover)]"
                        aria-label={`Edit draft "${post.title}"`}
                      >
                        ✏️
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-[var(--app-space-control-gap)]">
                    {post.status === 'DRAFT' && (
                      <span className="rounded-app-button bg-[var(--app-color-accent)] px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] text-xs font-medium text-[var(--app-color-accent-foreground)]">
                        Draft
                      </span>
                    )}
                    {post.status === 'PUBLISHED' && (
                      <span className="rounded-app-button bg-green-500 px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] text-xs font-medium text-white">
                        Published
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPostToDelete(post)
                        setDeleteConfirmOpen(true)
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-app-button text-red-500 hover:bg-red-50 hover:text-red-700"
                      aria-label={`Delete post "${post.title}"`}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                {post.subtitle && (
                  <p className="mb-[var(--app-space-label-gap)] text-sm text-[var(--app-color-text-muted)]">
                    {post.subtitle}
                  </p>
                )}
                <p className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: limitHtmlWords(post.content, postPreviewWordLimit) }} />
                <div className="mt-[var(--app-space-label-gap)] space-y-1 text-sm text-[var(--app-color-text-muted)]">
                  <p>Date: {new Date(post.createdAt).toLocaleDateString()}</p>
                  <p>Time: {new Date(post.createdAt).toLocaleTimeString()}</p>
                </div>
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
          <div className="w-full max-w-[var(--app-size-modal-max)] rounded-app-card [border:var(--app-border-width)_var(--app-border-style)_var(--app-border-dashboard)] bg-[var(--app-color-dashboard-surface)] p-[var(--app-space-modal)] text-[var(--app-color-text-primary)] shadow-xl">
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
            <label className="block text-sm font-medium text-[var(--app-color-text-primary)]" htmlFor="post-preview-word-limit">
              Post preview word limit
            </label>
            <input
              id="post-preview-word-limit"
              type="number"
              min="1"
              value={postPreviewWordLimit}
              onChange={(e) => {
                const nextLimit = Number(e.target.value)
                savePostPreviewWordLimit(Number.isFinite(nextLimit) && nextLimit > 0 ? Math.floor(nextLimit) : 1)
              }}
              className="mt-[var(--app-space-label-gap)] w-full rounded-app-card [border:var(--app-border-width)_var(--app-border-style)_var(--app-border-dashboard)] bg-[var(--app-color-dashboard-bg)] p-[var(--app-space-control-y)] text-[var(--app-color-text-primary)]"
            />
          </div>
        </div>
      )}

      {deleteConfirmOpen && postToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-color-overlay-scrim)] p-[var(--app-space-overlay)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
        >
          <div className="w-full max-w-[var(--app-size-modal-max)] rounded-app-card [border:var(--app-border-width)_var(--app-border-style)_var(--app-border-dashboard)] bg-[var(--app-color-dashboard-surface)] p-[var(--app-space-modal)] text-[var(--app-color-text-primary)] shadow-xl">
            <div className="mb-[var(--app-space-stack)]">
              <h2 id="delete-confirm-title" className="text-xl font-semibold">
                Delete Post
              </h2>
            </div>
            <p className="mb-[var(--app-space-stack)] text-[var(--app-color-text-primary)]">
              Are you sure you want to delete &ldquo;{postToDelete.title}&rdquo;? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-[var(--app-space-control-gap)]">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false)
                  setPostToDelete(null)
                }}
                className="rounded-app-button px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] text-sm font-medium text-[var(--app-color-text-primary)] hover:bg-[var(--app-color-dashboard-border)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deletePost(postToDelete)}
                className="rounded-app-button bg-red-500 px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] text-sm font-medium text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
