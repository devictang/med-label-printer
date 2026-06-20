import jsPDF from 'jspdf';
import { formatIngredientsDisplay } from '../components/IngredientEditor';
import { ensureCJKFont, registerCJKFont, setDocFont } from './pdfFont';
import type { LabelItem, LabelGridConfig } from '../types';

const A4_W = 210;  // mm
const A4_H = 297;  // mm

// ─── Grid helpers ────────────────────────────────────────────────

/** Compute exact cell dimensions to fill A4 evenly within margins+gaps */
function cellDims(config: LabelGridConfig) {
  const aw = A4_W - config.marginLeft - config.marginRight;
  const ah = A4_H - config.marginTop - config.marginBottom;
  return {
    w: (aw - (config.cols - 1) * config.gapX) / config.cols,
    h: (ah - (config.rows - 1) * config.gapY) / config.rows,
  };
}

function getPositions(config: LabelGridConfig, count: number) {
  const { w, h } = cellDims(config);
  const total = config.cols * config.rows;
  const positions: { x: number; y: number; w: number; h: number }[] = [];
  for (let i = 0; i < Math.min(count, total); i++) {
    const col = i % config.cols;
    const row = Math.floor(i / config.cols);
    positions.push({
      x: config.marginLeft + col * (w + config.gapX),
      y: config.marginTop + row * (h + config.gapY),
      w,
      h,
    });
  }
  return positions;
}

// ─── Content drawing ─────────────────────────────────────────────

function trunc(s: string, max: number, cut: number) {
  return s.length > max ? s.slice(0, cut) + '…' : s;
}

/**
 * Character-count based line wrapping — splits text every N characters.
 * This is used instead of jsPDF's splitTextToSize because the custom CJK
 * font may not have reliable glyph width metrics, causing text to overflow
 * the label width.
 *
 * For mixed CJK + Latin text at a given font size, we use a conservative
 * millimetres-per-character estimate based on CJK (wider) characters:
 *   10pt → 3.5 mm/char    8pt → 2.8 mm/char    7pt → 2.5 mm/char
 *   6.5pt → 2.3 mm/char   6pt → 2.1 mm/char    5pt → 1.8 mm/char
 *
 * This guarantees every line fits within `w` mm regardless of font metrics.
 */
function wrapByChar(text: string, mmPerChar: number, w: number, maxLines: number): string[] {
  const charsPerLine = Math.max(1, Math.floor(w / mmPerChar));
  const lines: string[] = [];
  for (let i = 0; i < text.length && lines.length < maxLines; i += charsPerLine) {
    lines.push(text.slice(i, i + charsPerLine));
  }
  return lines;
}

/**
 * Draw all content inside one label cell.
 *
 * Layout flows top→bottom with EVERY line bounded by maxTextY
 * (calculated from available cell height). Text never overflows
 * into the next label.
 *
 *   L1  Top bar:   Pharmacy name (L)  │  Qty/Unit (R)  7pt / 8pt bold
 *   L2  Brand name (bold, 10pt, auto-wrap, ≤2 lines, space-capped)
 *   L3  Ingredient (6.5pt, ≤1 line, skipped if no room)
 *   L4  Usage (7pt, auto-wrap, line-capped by remaining space)
 *      + ⚠ Precautions (bold, 6.5pt, bilingual, line-capped)
 *   L5  Bottom:     Patient name (bold) L  │  Date R  8pt / 6pt
 *                   Address                           5pt
 *
 * FULL BLACK & WHITE — no color ink used. Hierarchy via weight & size.
 */
function drawLabel(doc: jsPDF, cx: number, cy: number, cw: number, ch: number, item: LabelItem) {
  const pad = 1.5;
  const x = cx + pad;
  const y = cy + pad;
  const w = cw - pad * 2;
  const h = ch - pad * 2;

  // Cell border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(cx, cy, cw, ch);

  // ── L5: Bottom bar — draw first (fixed from bottom, always safe) ─
  const addrY = y + h - 0.5;
  setDocFont(doc, 'normal');
  doc.setFontSize(5);
  doc.setTextColor(100, 100, 100);
  doc.text(trunc(item.pharmacy.address, 60, 58), x, addrY);

  const infoY = addrY - 4;
  setDocFont(doc, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(trunc(item.patientName, 25, 23), x, infoY);
  setDocFont(doc, 'normal');
  doc.setFontSize(6);
  doc.setTextColor(80, 80, 80);
  doc.text(item.date, x + w, infoY, { align: 'right' });

  // ── Upper bound for the mid section ──────────────────────────
  const maxTextY = infoY - 1.5;
  if (maxTextY <= y + 8) return;

  // ── L1: Top bar ──────────────────────────────────────────────
  const topY = y + 2.5;
  setDocFont(doc, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text(trunc(item.pharmacy.name, 28, 26), x, topY);
  if (item.quantity) {
    setDocFont(doc, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(`${item.quantity} ${item.unit}`, x + w, topY, { align: 'right' });
  }

  // ── Mid section — character-count wrapping (no jsPDF metrics) ─
  let curY = y + 8;

  // L2: Brand name — 10pt bold, ~3.5mm/char, ≤2 lines
  setDocFont(doc, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const brandLines = wrapByChar(item.drug.brand_name, 3.5, w, 2);
  // Cap lines by vertical space (reserve ~9mm for ing+hk+usage below)
  let brandMax = Math.min(brandLines.length, 2);
  while (brandMax > 0 && curY + brandMax * 4 + 9 > maxTextY) brandMax--;
  brandLines.slice(0, brandMax).forEach((line: string) => {
    doc.text(line, x, curY);
    curY += 4;
  });

  // L3: Ingredient — 6.5pt, ~2.3mm/char, 1 line
  if (curY + 3 < maxTextY) {
    setDocFont(doc, 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(0, 0, 0);
    const ing = item.drug.ingredient ? formatIngredientsDisplay(item.drug.ingredient) : '';
    if (ing) {
      const ingLines = wrapByChar(ing, 2.3, w, 1);
      if (ingLines[0]) doc.text(ingLines[0], x, curY + 0.5);
      curY += 4;
    }
  }

  // HK# — 6pt, ~2.1mm/char, always fits
  if (curY + 2 < maxTextY) {
    doc.setFontSize(6);
    doc.setTextColor(80, 80, 80);
    doc.text(item.drug.hk_number, x, curY);
    curY += 3;
  }

  // ── L4: Usage — 7pt, ~2.5mm/char, capped by remaining space ────
  curY += 1;
  if (curY + 3 < maxTextY) {
    setDocFont(doc, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    const usageText = item.customUsage || item.drug.default_usage || '';
    if (usageText) {
      const cautionText = item.customPrecautions || item.drug.default_precautions || '';
      const cautionNeeded = cautionText ? 4 : 0;
      const usageAvail = maxTextY - curY - cautionNeeded;
      const usageMax = Math.max(1, Math.min(3, Math.floor(usageAvail / 3.5)));
      const usageLines = wrapByChar(usageText, 2.5, w, usageMax);
      usageLines.slice(0, usageMax).forEach((line: string) => {
        if (curY + 3.5 <= maxTextY) {
          doc.text(line, x, curY);
          curY += 3.5;
        }
      });
    }
  }

  // Precautions — bilingual, 6.5pt bold, capped by remaining space
  const cautionText = item.customPrecautions || item.drug.default_precautions || '';
  if (cautionText && curY + 2 < maxTextY) {
    curY += 0.5;
    doc.setTextColor(0, 0, 0);
    setDocFont(doc, 'bold');
    doc.setFontSize(6.5);

    const precautionLines = cautionText.split('\n').map((l) => l.trim()).filter(Boolean);
    const maxDraw = Math.min(2, Math.floor((maxTextY - curY) / 3.3));
    let drawn = 0;

    for (const line of precautionLines) {
      if (drawn >= maxDraw || curY >= maxTextY) break;

      const pipeIdx = line.indexOf('||');
      let en: string, zh: string;
      if (pipeIdx === -1) { en = line; zh = line; }
      else { en = line.slice(0, pipeIdx).trim(); zh = line.slice(pipeIdx + 2).trim(); }
      if (!en && !zh) continue;

      if (en === zh) {
        // Single language: char-wrap at 2.3mm/char
        const sl = wrapByChar(`⚠ ${en}`, 2.3, w, maxDraw - drawn);
        for (const s of sl) {
          if (curY >= maxTextY) break;
          doc.text(s, x, curY);
          curY += 3.3;
          drawn++;
        }
      } else {
        // Bilingual: try one line "⚠ {en}  {zh}"
        const combined = `⚠ ${en}  ${zh}`;
        // Estimate combined width: EN chars at ~2.1mm + ZH at ~2.3mm + ⚠ (~2mm) + spaces
        const estCombinedW = en.length * 2.1 + zh.length * 2.3 + 5;
        if (estCombinedW <= w && drawn < maxDraw && curY < maxTextY) {
          doc.text(combined, x, curY);
          curY += 3.3;
          drawn++;
        } else {
          // Two lines: EN ⚠ upper, ZH below
          if (en && drawn < maxDraw && curY < maxTextY) {
            const enLine = wrapByChar(`⚠ ${en}`, 2.3, w, 1)[0];
            if (enLine) doc.text(enLine, x, curY);
            curY += 3.3;
            drawn++;
          }
          if (zh && zh !== en && drawn < maxDraw && curY < maxTextY) {
            const zhLine = wrapByChar(zh, 2.3, w, 1)[0];
            if (zhLine) doc.text(zhLine, x, curY);
            curY += 3.3;
            drawn++;
          }
        }
      }
    }
  }
}

// ─── PDF generation ──────────────────────────────────────────────

/** Generate a PDF with labels. Returns the PDF as a Blob. */
export async function generateLabelPDF(
  items: LabelItem[],
  config: LabelGridConfig,
  includeEmptyGrid: boolean = true,
): Promise<Blob> {
  await ensureCJKFont();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  registerCJKFont(doc);

  const itemsPerPage = config.cols * config.rows;

  for (let pg = 0; pg < Math.ceil(items.length / itemsPerPage); pg++) {
    if (pg > 0) doc.addPage();

    const pageItems = items.slice(pg * itemsPerPage, (pg + 1) * itemsPerPage);
    const allPos = getPositions(config, includeEmptyGrid ? itemsPerPage : pageItems.length);

    if (includeEmptyGrid) {
      // 1. Draw empty grid outlines (light fill + thin border)
      const gridPos = getPositions(config, itemsPerPage);
      gridPos.forEach((pos) => {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.1);
        doc.rect(pos.x, pos.y, pos.w, pos.h, 'FD');
      });
      // 2. Draw filled labels on top
      pageItems.forEach((item, idx) => {
        if (idx < allPos.length) {
          drawLabel(doc, allPos[idx].x, allPos[idx].y, allPos[idx].w, allPos[idx].h, item);
        }
      });
    } else {
      allPos.forEach((pos, idx) => {
        if (idx < pageItems.length) {
          drawLabel(doc, pos.x, pos.y, pos.w, pos.h, pageItems[idx]);
        }
      });
    }

    // Page footer
    doc.setFontSize(4);
    doc.setTextColor(150, 150, 150);
    doc.text(`藥物標籤列印系統 - 第 ${pg + 1} 頁`, A4_W - 5, A4_H - 3, { align: 'right' });
  }

  return doc.output('blob');
}

/** Generate and download the PDF */
export async function downloadLabelPDF(items: LabelItem[], config: LabelGridConfig): Promise<void> {
  const blob = await generateLabelPDF(items, config);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `藥物標籤_${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Preview the PDF in a new tab */
export async function previewLabelPDF(items: LabelItem[], config: LabelGridConfig): Promise<void> {
  const blob = await generateLabelPDF(items, config);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
