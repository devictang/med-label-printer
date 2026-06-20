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

  // ── Upper bound for the mid section (brand → precautions) ─────
  const maxTextY = infoY - 1.5;  // last Y where mid-section text is safe
  if (maxTextY <= y + 8) return; // too small — nothing fits

  // ── L1: Top bar — fixed at top ────────────────────────────────
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

  // ── Mid section — every line below must check curY < maxTextY ──
  let curY = y + 8;

  // L2: Brand name — 10pt bold, auto-wrap, capped by remaining height
  setDocFont(doc, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const brandLines = doc.splitTextToSize(item.drug.brand_name, w);
  const brandLH = 4;
  // Reserve minimum space for: ingredient + HK# (~5mm) + 1 usage line (~4mm)
  let brandMax = Math.min(2, brandLines.length);
  while (brandMax > 0 && curY + brandMax * brandLH + 9 > maxTextY) {
    brandMax--;
  }
  brandLines.slice(0, brandMax).forEach((line: string) => {
    doc.text(line, x, curY);
    curY += brandLH;
  });

  // L3: Ingredient — 1 line only if enough room left
  if (curY + 3 < maxTextY) {
    setDocFont(doc, 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(0, 0, 0);
    const ing = item.drug.ingredient ? formatIngredientsDisplay(item.drug.ingredient) : '';
    if (ing) {
      const ingLines = doc.splitTextToSize(ing, w);
      doc.text(ingLines[0] || '', x, curY + 0.5);
      curY += 4;
    }
  }

  // HK# — 6pt
  if (curY + 2 < maxTextY) {
    doc.setFontSize(6);
    doc.setTextColor(80, 80, 80);
    doc.text(item.drug.hk_number, x, curY);
    curY += 3;
  }

  // ── L4: Usage — 7pt, word-wrapped, capped by remaining space ────
  curY += 1;
  if (curY + 3 < maxTextY) {
    setDocFont(doc, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    const usageText = item.customUsage || item.drug.default_usage || '';
    if (usageText) {
      const usageLines = doc.splitTextToSize(usageText, w);
      const usageLH = 3.5;
      const cautionText = item.customPrecautions || item.drug.default_precautions || '';
      const cautionNeeded = cautionText ? 4 : 0;
      const usageMax = Math.max(1, Math.min(3, Math.floor((maxTextY - curY - cautionNeeded) / usageLH)));
      usageLines.slice(0, usageMax).forEach((line: string) => {
        if (curY + usageLH <= maxTextY) {
          doc.text(line, x, curY);
          curY += usageLH;
        }
      });
    }
  }

  // Precautions — bold, 6.5pt, bilingual, capped by remaining space
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

      const combined = `⚠ ${en}  ${zh}`;
      let fitsOneLine = true;
      try { fitsOneLine = doc.getTextWidth(combined) <= w; } catch { fitsOneLine = false; }

      if (fitsOneLine && drawn < maxDraw && curY < maxTextY) {
        doc.text(combined, x, curY);
        curY += 3.3;
        drawn++;
      } else if (en === zh) {
        const singleLines = doc.splitTextToSize(`⚠ ${en}`, w);
        for (const sl of singleLines.slice(0, maxDraw - drawn)) {
          if (curY >= maxTextY) break;
          doc.text(sl, x, curY);
          curY += 3.3;
          drawn++;
        }
      } else {
        if (en && drawn < maxDraw && curY < maxTextY) {
          doc.text(`⚠ ${en}`, x, curY);
          curY += 3.3;
          drawn++;
        }
        if (zh && zh !== en && drawn < maxDraw && curY < maxTextY) {
          doc.text(zh, x, curY);
          curY += 3.3;
          drawn++;
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
