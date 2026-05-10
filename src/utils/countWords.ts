export function countWords(html: string): number {
  // Remove HTML tags
  const text = html.replace(/<[^>]*>/g, '')
  // Remove extra whitespace and split by spaces
  const words = text.trim().split(/\s+/)
  // Filter out empty strings
  return words.filter(word => word.length > 0).length
}