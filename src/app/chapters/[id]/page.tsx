'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'

interface Chapter {
  id: number
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export default function ChapterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchChapter = async () => {
      try {
        const res = await fetch(`/api/chapters/${id}`)
        if (!res.ok) {
          throw new Error('Chapter not found')
        }
        const data = await res.json()
        setChapter(data)
      } catch (error) {
        console.error('Failed to load chapter:', error)
        setChapter(null)
      } finally {
        setLoading(false)
      }
    }
    fetchChapter()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] text-[#e2e4ec]">
        <div className="max-w-4xl mx-auto p-8">Loading chapter...</div>
      </div>
    )
  }

  if (!chapter) {
    return (
      <div className="min-h-screen bg-[#020617] text-[#e2e4ec]">
        <div className="max-w-4xl mx-auto p-8">
          <h1 className="text-2xl font-bold">Chapter not found</h1>
          <p>The chapter you are looking for does not exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020617] text-[#e2e4ec]">
      <article className="max-w-2xl mx-auto px-4 py-12 font-serif leading-relaxed">
        <header className="mb-8">
          <Link
            href="/"
            className="mb-8 inline-flex rounded-app bg-[#111525] px-4 py-2 font-sans text-sm font-medium text-[#e2e4ec] transition hover:bg-[#1b2136]"
          >
            Dashboard
          </Link>
          <h1 className="text-4xl font-bold font-sans mb-4 leading-tight">
            {chapter.title}
          </h1>
          <div className="text-sm text-slate-300 border-b border-slate-700 pb-4">
            <time dateTime={new Date(chapter.createdAt).toISOString()}>
              {new Date(chapter.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </time>
          </div>
        </header>

        <div className="prose prose-lg max-w-none">
          <div className="whitespace-pre-wrap text-lg leading-8">
            {chapter.content}
          </div>
        </div>

        <footer className="mt-12 pt-8 border-t border-slate-700 text-sm text-slate-300">
          <p>Published on {new Date(chapter.updatedAt).toLocaleDateString()}</p>
        </footer>
      </article>
    </div>
  )
}
