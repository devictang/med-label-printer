import jsPDF from 'jspdf';

const FONT_URL = '/fonts/wqy-subset.ttf';
const FONT_NAME = 'WenQuanYi';
const VFS_KEY = 'wqy-subset.ttf';

let fontBase64: string | null = null;
let fontLoaded = false;
let fontLoading: Promise<void> | null = null;

/** Load the CJK font from the server and cache its base64 data.
 *  Must resolve before calling registerCJKFont(). */
export async function ensureCJKFont(): Promise<void> {
  if (fontLoaded) return;
  if (fontLoading) return fontLoading;

  fontLoading = (async () => {
    try {
      const resp = await fetch(FONT_URL);
      const buffer = await resp.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      fontBase64 = btoa(binary);
      fontLoaded = true;
    } catch (err) {
      console.warn('Failed to load CJK font:', err);
      fontLoading = null;
    }
  })();

  return fontLoading;
}

/** Register the CJK font on a specific jsPDF instance.
 *  Call this right after `new jsPDF()` and before drawing any text. */
export function registerCJKFont(doc: jsPDF): void {
  if (!fontBase64) return;
  try {
    doc.addFileToVFS(VFS_KEY, fontBase64);
    doc.addFont(VFS_KEY, FONT_NAME, 'normal');
    doc.addFont(VFS_KEY, FONT_NAME, 'bold');
  } catch {
    // Font registration may fail if already registered on this instance
  }
}

/** Set the CJK font on a doc. Call after registerCJKFont(). */
export function setDocFont(doc: jsPDF, style: 'normal' | 'bold' = 'normal'): void {
  if (fontBase64) {
    try {
      doc.setFont(FONT_NAME, style);
      return;
    } catch { /* fall through */ }
  }
  doc.setFont('Helvetica', style);
}

export { FONT_NAME };
