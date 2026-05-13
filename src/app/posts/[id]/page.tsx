'use client'

import { use, useState, useEffect, useCallback } from 'react'
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

  const unpublishPost = useCallback(async () => {
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
  }, [post])

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('post-viewer-state-change', {
        detail: {
          status: post?.status ?? null,
          isUnpublishing: unpublishing,
        },
      })
    )
  }, [post?.status, unpublishing])

  useEffect(() => {
    window.addEventListener('post-viewer-unpublish', unpublishPost)
    return () => window.removeEventListener('post-viewer-unpublish', unpublishPost)
  }, [unpublishPost])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--app-color-reader-bg)] text-[var(--app-color-reader-text)]">
        <div className="mx-auto w-full max-w-[var(--app-size-dashboard-content-max)] p-[var(--app-space-dashboard-page)]">Loading post...</div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[var(--app-color-reader-bg)] text-[var(--app-color-reader-text)]">
        <div className="mx-auto w-full max-w-[var(--app-size-dashboard-content-max)] p-[var(--app-space-dashboard-page)]">
          <h1 className="text-2xl font-bold">Post not found</h1>
          <p>The post you are looking for does not exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--app-color-reader-bg)] text-[var(--app-color-reader-text)]">
      <article className="mx-auto w-full max-w-[var(--app-size-reader-content-max)] px-[var(--app-space-reader-x)] py-[var(--app-space-reader-y)] font-serif leading-relaxed">
        <header className="mb-[var(--app-space-section)]">
          <div className="mb-[var(--app-space-section)] flex gap-2">
            {post.status === 'DRAFT' && (
              <Link
                href={`/posts/${post.id}/edit`}
                className="inline-flex rounded-app bg-[var(--app-color-accent)] px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] font-sans text-sm font-medium text-[var(--app-color-accent-foreground)] transition hover:bg-[var(--app-color-accent-hover)]"
              >
                Edit Draft
              </Link>
            )}
          </div>
          <h1 className="mb-[var(--app-space-card)] break-words font-sans text-3xl font-bold leading-tight sm:text-4xl">
            {post.title}
          </h1>
          {post.subtitle && (
            <p className="mb-[var(--app-space-card)] break-words font-sans text-lg leading-7 text-[var(--app-color-reader-placeholder)] sm:text-xl sm:leading-8">
              {post.subtitle}
            </p>
          )}
          <div className="space-y-1 text-sm text-[var(--app-color-reader-muted)] [border-bottom:var(--app-border-width)_var(--app-border-style)_var(--app-border-reader)] pb-[var(--app-space-card)]">
            <time dateTime={new Date(post.createdAt).toISOString()}>
              Date: {new Date(post.createdAt).toLocaleDateString()}
            </time>
            <p>Time: {new Date(post.createdAt).toLocaleTimeString()}</p>
          </div>
        </header>

        <div className="prose prose-lg max-w-none">
          <div className="story-text text-base leading-7 sm:text-lg" dangerouslySetInnerHTML={{ __html: post.content }} />
        </div>

        <footer className="mt-[var(--app-space-reader-footer-margin)] space-y-1 pt-[var(--app-space-reader-footer-top)] [border-top:var(--app-border-width)_var(--app-border-style)_var(--app-border-reader)] text-sm text-[var(--app-color-reader-muted)]">
          <p>{post.status === 'PUBLISHED' ? 'Published' : 'Draft last updated'}</p>
          <p>Date: {new Date(post.updatedAt).toLocaleDateString()}</p>
          <p>Time: {new Date(post.updatedAt).toLocaleTimeString()}</p>
        </footer>
      </article>
    </div>
  )
}
