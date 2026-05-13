'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type EditorTopBarState = {
  saveStatus: SaveStatus
  previewHref: string | null
  canPublish: boolean
  isPublishing: boolean
}

type PostTopBarState = {
  status: string | null
  isUnpublishing: boolean
}

const initialEditorState: EditorTopBarState = {
  saveStatus: 'idle',
  previewHref: null,
  canPublish: false,
  isPublishing: false,
}

const initialPostState: PostTopBarState = {
  status: null,
  isUnpublishing: false,
}

function getSaveLabel(status: SaveStatus) {
  if (status === 'idle') return ''
  if (status === 'saving') return 'Saving...'
  if (status === 'error') return 'Save failed'
  return 'Saved'
}

function getSaveDotClass(status: SaveStatus) {
  if (status === 'saved') return 'bg-green-500'
  if (status === 'saving') return 'bg-red-500'
  if (status === 'error') return 'bg-red-500'
  return ''
}

export default function AppTopBar() {
  const pathname = usePathname()
  const [trackedEditorState, setTrackedEditorState] = useState<EditorTopBarState>(initialEditorState)
  const [trackedPostState, setTrackedPostState] = useState<PostTopBarState>(initialPostState)

  const isEditorScreen = useMemo(
    () => pathname === '/posts/new' || /^\/posts\/[^/]+\/edit$/.test(pathname),
    [pathname]
  )
  const isPostScreen = useMemo(
    () => /^\/posts\/[^/]+$/.test(pathname) && pathname !== '/posts/new',
    [pathname]
  )

  useEffect(() => {
    if (!isEditorScreen) {
      return
    }

    const handleEditorStateChange = (event: Event) => {
      const nextState = (event as CustomEvent<Partial<EditorTopBarState>>).detail
      setTrackedEditorState((currentState) => ({
        ...currentState,
        ...nextState,
      }))
    }

    window.addEventListener('post-editor-state-change', handleEditorStateChange)
    return () => window.removeEventListener('post-editor-state-change', handleEditorStateChange)
  }, [isEditorScreen])

  useEffect(() => {
    if (!isPostScreen) {
      return
    }

    const handlePostStateChange = (event: Event) => {
      const nextState = (event as CustomEvent<Partial<PostTopBarState>>).detail
      setTrackedPostState((currentState) => ({
        ...currentState,
        ...nextState,
      }))
    }

    window.addEventListener('post-viewer-state-change', handlePostStateChange)
    return () => window.removeEventListener('post-viewer-state-change', handlePostStateChange)
  }, [isPostScreen])

  const publishPost = () => {
    window.dispatchEvent(new Event('post-editor-publish'))
  }

  const unpublishPost = () => {
    window.dispatchEvent(new Event('post-viewer-unpublish'))
  }

  if (pathname === '/') {
    return null
  }

  const editorState = isEditorScreen ? trackedEditorState : initialEditorState
  const postState = isPostScreen ? trackedPostState : initialPostState
  const saveStatusClass =
    editorState.saveStatus === 'error'
      ? 'text-[var(--app-color-error-dark-text)]'
      : 'text-[var(--app-color-text-muted)]'

  const isPublishedPostScreen = isPostScreen && postState.status === 'PUBLISHED'

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--app-color-dashboard-border)] bg-[var(--app-color-dashboard-surface)] text-[var(--app-color-text-primary)]">
      <div className="mx-auto flex min-h-14 w-full max-w-7xl flex-wrap items-center gap-2 px-3 py-2 sm:flex-nowrap sm:px-6">
        <Link
          href="/"
          className="inline-flex h-9 items-center rounded-app-button px-2.5 font-sans text-sm font-medium text-[var(--app-color-text-primary)] hover:bg-[var(--app-color-dashboard-border)] sm:px-3"
        >
          Dashboard
        </Link>

        {isPublishedPostScreen ? (
          <button
            type="button"
            onClick={unpublishPost}
            disabled={postState.isUnpublishing}
            className="inline-flex h-9 items-center rounded-app-button bg-red-600 px-2.5 font-sans text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3"
          >
            {postState.isUnpublishing ? 'Unpublishing' : 'Unpublish'}
          </button>
        ) : isEditorScreen ? (
          <button
            type="button"
            onClick={publishPost}
            disabled={!editorState.canPublish || editorState.isPublishing}
            className="inline-flex h-9 items-center rounded-app-button bg-[var(--app-color-accent)] px-2.5 font-sans text-sm font-medium text-[var(--app-color-accent-foreground)] hover:bg-[var(--app-color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50 sm:px-3"
          >
            {editorState.isPublishing ? 'Publishing' : 'Publish Post'}
          </button>
        ) : isPostScreen ? null : (
          <Link
            href="/posts/new"
            className="inline-flex h-9 items-center rounded-app-button bg-[var(--app-color-dashboard-panel)] px-2.5 font-sans text-sm font-medium text-[var(--app-color-text-primary)] hover:bg-[var(--app-color-dashboard-border)] sm:px-3"
          >
            Publish Post
          </Link>
        )}

        {!isPostScreen && (
          <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
            {editorState.saveStatus !== 'idle' && (
              <span className={`inline-flex h-9 items-center gap-2 rounded-app-button px-2.5 font-sans text-sm sm:px-3 ${saveStatusClass}`}>
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 rounded-full ${getSaveDotClass(editorState.saveStatus)}`}
                />
                {getSaveLabel(editorState.saveStatus)}
              </span>
            )}

            {isEditorScreen && editorState.previewHref ? (
              <Link
                href={editorState.previewHref}
                className="ml-auto inline-flex h-9 items-center rounded-app-button bg-[var(--app-color-reader-surface)] px-2.5 font-sans text-sm font-medium text-[var(--app-color-reader-text)] hover:bg-[var(--app-color-reader-surface-hover)] sm:ml-0 sm:px-3"
              >
                Preview Post
              </Link>
            ) : (
              <span className="ml-auto inline-flex h-9 items-center rounded-app-button px-2.5 font-sans text-sm text-[var(--app-color-text-muted)] opacity-60 sm:ml-0 sm:px-3">
                Preview Post
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
