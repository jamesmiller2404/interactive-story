import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export const runtime = 'nodejs'

function parseChapterId(id: string) {
  const chapterId = Number(id)
  return Number.isInteger(chapterId) && chapterId > 0 ? chapterId : null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const chapterId = parseChapterId(id)
    if (!chapterId) {
      return NextResponse.json({ error: 'Invalid chapter id' }, { status: 400 })
    }

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId }
    })
    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
    }
    return NextResponse.json(chapter)
  } catch (error) {
    console.error('Failed to fetch chapter:', error)
    return NextResponse.json({ error: 'Failed to fetch chapter' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const chapterId = parseChapterId(id)
    if (!chapterId) {
      return NextResponse.json({ error: 'Invalid chapter id' }, { status: 400 })
    }

    const { title, content } = await request.json()
    const chapter = await prisma.chapter.update({
      where: { id: chapterId },
      data: { title, content }
    })
    return NextResponse.json(chapter)
  } catch (error) {
    console.error('Failed to update chapter:', error)
    return NextResponse.json({ error: 'Failed to update chapter' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const chapterId = parseChapterId(id)
    if (!chapterId) {
      return NextResponse.json({ error: 'Invalid chapter id' }, { status: 400 })
    }

    await prisma.chapter.delete({
      where: { id: chapterId }
    })
    return NextResponse.json({ message: 'Chapter deleted' })
  } catch (error) {
    console.error('Failed to delete chapter:', error)
    return NextResponse.json({ error: 'Failed to delete chapter' }, { status: 500 })
  }
}
