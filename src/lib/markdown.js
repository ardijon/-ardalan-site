/**
 * Shared markdown rendering utilities
 */

export function escapeHtml(input) {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function escapeMd(input) {
  return String(input)
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

export function sanitizeUrl(url) {
  try {
    const parsed = new URL(url)
    if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return url
    }
  } catch {
    // Invalid URL
  }
  return '#'
}

export function renderMarkdown(text) {
  if (!text) return ''

  let html = escapeHtml(text)

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    const safeUrl = sanitizeUrl(url)
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-[var(--color-accent)] hover:underline">${text}</a>`
  })

  // Line breaks
  html = html.replace(/\n/g, '<br />')

  return html
}
