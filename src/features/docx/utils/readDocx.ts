import mammoth from 'mammoth';
import type { DocxPreview } from '../types/docx';

/**
 * Strips HTML tags from a string to get raw text content.
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, '').trim();
}

export const readDocx = async (buffer: ArrayBuffer): Promise<DocxPreview> => {
  // convertToHtml preserves basic formatting like bold, italic, underline
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
  
  // Split by paragraph tags to create individual blocks
  const paragraphs = result.value
    .split('</p>')
    .map(p => p.replace('<p>', '').trim())
    .filter(p => p.length > 0);

  return {
    lines: paragraphs.map((html, index) => {
      const text = stripHtml(html);
      return {
        index,
        html,
        text,
        isEmpty: text.length === 0,
      };
    }),
  };
};
