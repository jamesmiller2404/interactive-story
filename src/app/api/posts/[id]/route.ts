import { NextRequest, NextResponse } from 'next/server'
import { PostStatus, Prisma } from '@prisma/client'
import { prisma } from '../../../../lib/prisma'

export const runtime = 'nodejs'

function parsePostId(id: string) {
  const postId = Number(id)
  return Number.isInteger(postId) && postId > 0 ? postId : null
}

function parsePostStatus(status: unknown) {
  return Object.values(PostStatus).includes(status as PostStatus) ? status as PostStatus : null
}

function normalizeSubtitle(subtitle: unknown) {
  return typeof subtitle === 'string' && subtitle.trim() ? subtitle.trim() : null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const postId = parsePostId(id)
    if (!postId) {
      return NextResponse.json({ error: 'Invalid post id' }, { status: 400 })
    }

    const post = await prisma.post.findUnique({
      where: { id: postId }
    })
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    return NextResponse.json(post)
  } catch (error) {
    console.error('Failed to fetch post:', error)
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const postId = parsePostId(id)
    if (!postId) {
      return NextResponse.json({ error: 'Invalid post id' }, { status: 400 })
    }

    const { title, subtitle, content, status } = await request.json()
    const data: Prisma.PostUpdateInput = {}
    if (title !== undefined) data.title = title
    if (subtitle !== undefined) data.subtitle = normalizeSubtitle(subtitle)
    if (content !== undefined) data.content = content
    if (status !== undefined) {
      const parsedStatus = parsePostStatus(status)
      if (!parsedStatus) {
        return NextResponse.json({ error: 'Invalid post status' }, { status: 400 })
      }
      data.status = parsedStatus
    }

    const post = await prisma.post.update({
      where: { id: postId },
      data
    })
    return NextResponse.json(post)
  } catch (error) {
    console.error('Failed to update post:', error)
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const postId = parsePostId(id)
    if (!postId) {
      return NextResponse.json({ error: 'Invalid post id' }, { status: 400 })
    }

    await prisma.post.delete({
      where: { id: postId }
    })
    return NextResponse.json({ message: 'Post deleted' })
  } catch (error) {
    console.error('Failed to delete post:', error)
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
}
