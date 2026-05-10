import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const chapters = await prisma.chapter.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(chapters)
  } catch (error) {
    console.error('Failed to fetch chapters:', error)
    return NextResponse.json({ error: 'Failed to fetch chapters' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, content } = await request.json()
    const chapter = await prisma.chapter.create({
      data: { title, content }
    })
    return NextResponse.json(chapter, { status: 201 })
  } catch (error) {
    console.error('Failed to create chapter:', error)
    return NextResponse.json({ error: 'Failed to create chapter' }, { status: 500 })
  }
}
