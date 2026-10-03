const escapeText = (text) => String(text || '').replace(/[&<>"']/g, (value) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[value]));

// Older documents used structured editor JSON; preserve their text and formatting.
export const documentContentHtml = (content) => {
  if (typeof content === 'string') return content;
  if (!content || typeof content !== 'object') return '';
  if (content.type === 'text') {
    return (content.marks || []).reduce((text, mark) => {
      const tag = { bold: 'strong', italic: 'em', underline: 'u', strike: 's', code: 'code' }[mark.type];
      return tag ? `<${tag}>${text}</${tag}>` : text;
    }, escapeText(content.text));
  }
  if (content.type === 'hardBreak') return '<br>';
  if (content.type === 'horizontalRule') return '<hr>';
  const children = (content.content || []).map(documentContentHtml).join('');
  const tag = { paragraph: 'p', bulletList: 'ul', orderedList: 'ol', listItem: 'li', blockquote: 'blockquote', codeBlock: 'pre' }[content.type];
  if (content.type === 'heading') { const level = Math.max(1, Math.min(6, Number(content.attrs?.level) || 1)); return `<h${level}>${children}</h${level}>`; }
  return tag ? `<${tag}>${children}</${tag}>` : children;
};
