'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'

interface Post {
  id: number
  title: string
  content: string
  status: string
  createdAt: string
  updatedAt: string
}

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [unpublishing, setUnpublishing] = useState(false)

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/posts/${id}`)
        if (!res.ok) {
          throw new Error('Post not found')
        }
        const data = await res.json()
        setPost(data)
      } catch (error) {
        console.error('Failed to load post:', error)
        setPost(null)
      } finally {
        setLoading(false)
      }
    }
    fetchPost()
  }, [id])

  const unpublishPost = async () => {
    if (!post) return
    setUnpublishing(true)
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DRAFT' })
      })
      if (!res.ok) {
        throw new Error('Failed to unpublish post')
      }
      const updatedPost = await res.json()
      setPost(updatedPost)
      // Optionally redirect to edit page
      window.location.href = `/posts/${post.id}/edit`
    } catch (error) {
      console.error('Failed to unpublish post:', error)
      alert('Failed to unpublish post')
    } finally {
      setUnpublishing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--app-color-reader-bg)] text-[var(--app-color-reader-text)]">
        <div className="max-w-[var(--app-size-dashboard-content-max)] mx-auto p-[var(--app-space-dashboard-page)]">Loading post...</div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[var(--app-color-reader-bg)] text-[var(--app-color-reader-text)]">
        <div className="max-w-[var(--app-size-dashboard-content-max)] mx-auto p-[var(--app-space-dashboard-page)]">
          <h1 className="text-2xl font-bold">Post not found</h1>
          <p>The post you are looking for does not exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--app-color-reader-bg)] text-[var(--app-color-reader-text)]">
      <article className="max-w-[var(--app-size-reader-content-max)] mx-auto px-[var(--app-space-reader-x)] py-[var(--app-space-reader-y)] font-serif leading-relaxed">
        <header className="mb-[var(--app-space-section)]">
          <div className="mb-[var(--app-space-section)] flex gap-2">
            <Link
              href="/"
              className="inline-flex rounded-app bg-[var(--app-color-reader-surface)] px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] font-sans text-sm font-medium text-[var(--app-color-reader-text)] transition hover:bg-[var(--app-color-reader-surface-hover)]"
            >
              Dashboard
            </Link>
            {post.status === 'DRAFT' && (
              <Link
                href={`/posts/${post.id}/edit`}
                className="inline-flex rounded-app bg-[var(--app-color-accent)] px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] font-sans text-sm font-medium text-[var(--app-color-accent-foreground)] transition hover:bg-[var(--app-color-accent-hover)]"
              >
                Edit Draft
              </Link>
            )}
            {post.status === 'PUBLISHED' && (
              <button
                onClick={unpublishPost}
                disabled={unpublishing}
                className="inline-flex rounded-app bg-red-600 px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] font-sans text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {unpublishing ? 'Unpublishing...' : 'Unpublish'}
              </button>
            )}
          </div>
          <h1 className="text-4xl font-bold font-sans mb-[var(--app-space-card)] leading-tight">
            {post.title}
          </h1>
          <div className="text-sm text-[var(--app-color-reader-muted)] [border-bottom:var(--app-border-width)_var(--app-border-style)_var(--app-border-reader)] pb-[var(--app-space-card)]">
            <time dateTime={new Date(post.createdAt).toISOString()}>
              {new Date(post.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </time>
          </div>
        </header>

        <div className="prose prose-lg max-w-none">
          <div className="whitespace-pre-wrap text-lg leading-8">
            {post.content}
          </div>
        </div>

        <footer className="mt-[var(--app-space-reader-footer-margin)] pt-[var(--app-space-reader-footer-top)] [border-top:var(--app-border-width)_var(--app-border-style)_var(--app-border-reader)] text-sm text-[var(--app-color-reader-muted)]">
          <p>
            {post.status === 'PUBLISHED'
              ? `Published on ${new Date(post.updatedAt).toLocaleDateString()}`
              : `Draft last updated on ${new Date(post.updatedAt).toLocaleDateString()}`
            }
          </p>
        </footer>
      </article>
    </div>
  )
}
