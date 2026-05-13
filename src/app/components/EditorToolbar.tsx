'use client'

import type { ChangeEvent, RefObject } from 'react'
import type { Editor } from '@tiptap/react'

type EditorToolbarProps = {
  editor: Editor | null
  fileInputRef: RefObject<HTMLInputElement | null>
  isUploadingImage: boolean
  onImageInputChange: (event: ChangeEvent<HTMLInputElement>) => void
}

export default function EditorToolbar({
  editor,
  fileInputRef,
  isUploadingImage,
  onImageInputChange,
}: EditorToolbarProps) {
  if (!editor) return null

  const buttonClass = (active = false) =>
    `rounded-app px-[var(--app-space-control-x)] py-[var(--app-space-control-y)] font-sans text-sm font-medium ${
      active
        ? 'bg-[var(--app-color-accent)] text-[var(--app-color-accent-foreground)]'
        : 'bg-[var(--app-color-reader-surface)] text-[var(--app-color-reader-text)] hover:bg-[var(--app-color-reader-surface-hover)]'
    }`

  return (
    <div className="flex flex-wrap gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        onChange={onImageInputChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={buttonClass(editor.isActive('bold'))}
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={buttonClass(editor.isActive('italic'))}
      >
        <em>I</em>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={buttonClass(editor.isActive('blockquote'))}
      >
        &ldquo;
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={buttonClass(editor.isActive('codeBlock'))}
      >
        &lt;/&gt;
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className={buttonClass()}
      >
        -
      </button>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploadingImage}
        title={isUploadingImage ? 'Uploading image' : 'Upload image'}
        className={`${buttonClass()} disabled:opacity-50`}
      >
        Image
      </button>
    </div>
  )
}
