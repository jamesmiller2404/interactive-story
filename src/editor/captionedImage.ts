import { mergeAttributes, Node } from '@tiptap/core'

export const CaptionedImage = Node.create({
  name: 'captionedImage',

  group: 'block',

  content: 'inline*',

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: element => element.querySelector('img')?.getAttribute('src'),
      },
      alt: {
        default: null,
        parseHTML: element => element.querySelector('img')?.getAttribute('alt'),
      },
      title: {
        default: null,
        parseHTML: element => element.querySelector('img')?.getAttribute('title'),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-type="captioned-image"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const { src, alt, title } = HTMLAttributes

    return [
      'figure',
      { 'data-type': 'captioned-image' },
      ['img', mergeAttributes({ src, alt, title })],
      ['figcaption', 0],
    ]
  },
})
