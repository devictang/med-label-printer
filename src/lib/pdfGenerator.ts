import jsPDF from 'jspdf';
import { formatIngredientsDisplay } from '../components/IngredientEditor';
import { ensureCJKFont, registerCJKFont, setDocFont } from './pdfFont';
import { loadFontScale } from './storage';
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

/** Draw all content inside one label cell.
 *
 *   Top bar:   Pharmacy name (L)  │  Qty/Unit (R)  7pt / 8pt bold
 *   Brand name (bold, 10pt, wrap ≤2 lines)
 *   Ingredient (6.5pt, 1 line)  →  HK# (6pt)
 *   Usage (7pt, wrap ≤3 lines)
 *   ⚠ Precautions (bold, 6.5pt, bilingual, all shown)
 *   Bottom:     Patient name (bold) L  │  Date R  8pt / 6pt
 *               Address                           5pt
 *
 * FULL BLACK & WHITE — no color ink used. Hierarchy via weight & size.
 */
function drawLabel(doc: jsPDF, cx: number, cy: number, cw: number, ch: number, item: LabelItem) {
  const fs = loadFontScale();
  const pad = 1.5;
  const x = cx + pad;
  const y = cy + pad;
  const w = cw - pad * 2;
  const h = ch - pad * 2;

  // Cell border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(cx, cy, cw, ch);

  // ── Bottom bar (fixed from bottom) ─────────────────────────
  const addrY = y + h - 0.5;
  setDocFont(doc, 'normal');
  doc.setFontSize(5 * fs);
  doc.setTextColor(100, 100, 100);
  doc.text(item.pharmacy.address.slice(0, 58), x, addrY);

  const infoY = addrY - 4 * fs;
  setDocFont(doc, 'bold');
  doc.setFontSize(8 * fs);
  doc.setTextColor(0, 0, 0);
  doc.text(item.patientName.slice(0, 23), x, infoY);
  setDocFont(doc, 'normal');
  doc.setFontSize(6 * fs);
  doc.setTextColor(80, 80, 80);
  doc.text(item.date, x + w, infoY, { align: 'right' });

  // ── Top bar (fixed at top) ─────────────────────────────────
  const topY = y + 2.5 * fs;
  setDocFont(doc, 'normal');
  doc.setFontSize(7 * fs);
  doc.setTextColor(0, 0, 0);
  doc.text(item.pharmacy.name.slice(0, 26), x, topY);
  if (item.quantity) {
    setDocFont(doc, 'bold');
    doc.setFontSize(8 * fs);
    doc.setTextColor(0, 0, 0);
    doc.text(`${item.quantity} ${item.unit}`, x + w, topY, { align: 'right' });
  }

  // ── Mid section — wrap via splitTextToSize, no vertical cap ─
  let curY = y + 8 * fs;

  // Brand name — 10pt bold, wrap, max 2 lines
  setDocFont(doc, 'bold');
  doc.setFontSize(10 * fs);
  doc.setTextColor(0, 0, 0);
  const brandLines = doc.splitTextToSize(item.drug.brand_name, w);
  brandLines.slice(0, 2).forEach((line: string) => {
    doc.text(line, x, curY);
    curY += 4 * fs;
  });

  // Ingredient — 6.5pt, 1 line
  setDocFont(doc, 'normal');
  doc.setFontSize(6.5 * fs);
  doc.setTextColor(0, 0, 0);
  const ing = item.drug.ingredient ? formatIngredientsDisplay(item.drug.ingredient) : '';
  if (ing) {
    const ingLines = doc.splitTextToSize(ing, w);
    doc.text(ingLines[0] || '', x, curY + 0.5 * fs);
    curY += 4 * fs;
  }

  // HK# — 6pt
  doc.setFontSize(6 * fs);
  doc.setTextColor(80, 80, 80);
  doc.text(item.drug.hk_number, x, curY);
  curY += 3.5 * fs;

  // Usage — 7pt, wrap
  curY += 1 * fs;
  setDocFont(doc, 'normal');
  doc.setFontSize(7 * fs);
  doc.setTextColor(0, 0, 0);
  const usageText = item.customUsage || item.drug.default_usage || '';
  if (usageText) {
    const usageLines = doc.splitTextToSize(usageText, w);
    usageLines.slice(0, 3).forEach((line: string) => {
      doc.text(line, x, curY);
      curY += 3.5 * fs;
    });
  }

  // Precautions — bilingual, 6.5pt bold — show all, no line cap
  const cautionText = item.customPrecautions || item.drug.default_precautions || '';
  if (cautionText) {
    curY += 0.5 * fs;
    doc.setTextColor(0, 0, 0);
    setDocFont(doc, 'bold');
    doc.setFontSize(6.5 * fs);

    const precautionLines = cautionText.split('\n').map((l) => l.trim()).filter(Boolean);
    for (const line of precautionLines) {
      const pipeIdx = line.indexOf('||');
      let en: string, zh: string;
      if (pipeIdx === -1) { en = line; zh = line; }
      else { en = line.slice(0, pipeIdx).trim(); zh = line.slice(pipeIdx + 2).trim(); }
      if (!en && !zh) continue;

      if (en === zh) {
        // Single language
        const lines = doc.splitTextToSize(`⚠ ${en}`, w);
        for (const s of lines) {
          doc.text(s, x, curY);
          curY += 3.3 * fs;
        }
      } else {
        // Bilingual: try one line first
        const combined = `⚠ ${en}  ${zh}`;
        const combinedLines = doc.splitTextToSize(combined, w);
        if (combinedLines.length === 1) {
          doc.text(combined, x, curY);
          curY += 3.3 * fs;
        } else {
          // EN + ZH on separate lines
          const enLines = doc.splitTextToSize(`⚠ ${en}`, w);
          enLines.forEach((s: string) => { doc.text(s, x, curY); curY += 3.3 * fs; });
          const zhLines = doc.splitTextToSize(zh, w);
          zhLines.forEach((s: string) => { doc.text(s, x, curY); curY += 3.3 * fs; });
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
    doc.setFontSize(4 * loadFontScale());
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
