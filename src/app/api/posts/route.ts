import { NextRequest, NextResponse } from 'next/server'
import { PostStatus, Prisma } from '@prisma/client'
import { prisma } from '../../../lib/prisma'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(posts)
  } catch (error) {
    console.error('Failed to fetch posts:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}

function generateTitle() {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  return `Untitled ${dateStr}, ${timeStr}`
}

function parsePostStatus(status: unknown) {
  return Object.values(PostStatus).includes(status as PostStatus) ? status as PostStatus : null
}

function normalizeSubtitle(subtitle: unknown) {
  return typeof subtitle === 'string' && subtitle.trim() ? subtitle.trim() : null
}

export async function POST(request: NextRequest) {
  try {
    const { title, subtitle, content, status } = await request.json()
    const parsedStatus = status === undefined ? PostStatus.DRAFT : parsePostStatus(status)
    if (!parsedStatus) {
      return NextResponse.json({ error: 'Invalid post status' }, { status: 400 })
    }

    const finalTitle = title && title.trim() ? title : generateTitle()
    const post = await prisma.post.create({
      data: { title: finalTitle, subtitle: normalizeSubtitle(subtitle), content, status: parsedStatus }
    })
    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error('Failed to create post:', error)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, title, subtitle, content, status } = await request.json()
    const finalTitle = title !== undefined && title.trim() ? title : title === '' ? generateTitle() : undefined
    const updateData: Prisma.PostUpdateInput = {}
    if (finalTitle !== undefined) updateData.title = finalTitle
    if (subtitle !== undefined) updateData.subtitle = normalizeSubtitle(subtitle)
    if (content !== undefined) updateData.content = content
    if (status !== undefined) {
      const parsedStatus = parsePostStatus(status)
      if (!parsedStatus) {
        return NextResponse.json({ error: 'Invalid post status' }, { status: 400 })
      }
      updateData.status = parsedStatus
    }
    const post = await prisma.post.update({
      where: { id },
      data: updateData
    })
    return NextResponse.json(post)
  } catch (error) {
    console.error('Failed to update post:', error)
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
  }
}
