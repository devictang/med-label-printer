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
 * Layout layers (top → bottom within the cell):
 *   L1  Top bar:  Pharmacy name (L)  │  HK# (R)      7pt / 6pt
 *   L2  Drug:     Brand name (bold)  8pt  →  Ingredient  6.5pt
 *   L3  Core:     Usage  7pt  →  ⚠ Precautions (bold, red)  6.5pt
 *   L4  Bottom:   Patient name (bold) L  │  Date R  8pt / 6pt
 *                 Address                           5pt
 */
function drawLabel(doc: jsPDF, cx: number, cy: number, cw: number, ch: number, item: LabelItem) {
  const pad = 1.5;
  const x = cx + pad;
  const y = cy + pad;
  const w = cw - pad * 2;
  const h = ch - pad * 2;

  // Cell border
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(cx, cy, cw, ch);

  // ── L1: Top bar ─────────────────────────────────────────────
  // Pharmacy name — left, 7pt, #464646
  setDocFont(doc, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(70, 70, 70);
  doc.text(trunc(item.pharmacy.name, 30, 28), x, y + 2.5);

  // HK# — right, 6pt, #828282
  doc.setFontSize(6);
  doc.setTextColor(130, 130, 130);
  doc.text(`HK: ${item.drug.hk_number}`, x + w, y + 2.5, { align: 'right' });

  // ── L2: Drug info ───────────────────────────────────────────
  // Brand name — bold, 8pt, #003280
  setDocFont(doc, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 50, 128);
  doc.text(trunc(item.drug.brand_name, 38, 36), x, y + 7.5);

  // Ingredient — 6.5pt, #323232
  setDocFont(doc, 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(50, 50, 50);
  const ing = item.drug.ingredient ? formatIngredientsDisplay(item.drug.ingredient) : '';
  if (ing) doc.text(trunc(ing, 50, 48), x, y + 12);

  // ── L3: Usage + Precautions ─────────────────────────────────
  // Bottom-section reserve: address (5pt ≈ 2 mm) + patient/date (8pt ≈ 3 mm)
  const bottomReserve = 6;     // mm from bottom of content area that is reserved
  const maxTextY = y + h - bottomReserve;  // last safe baseline for usage/precautions lines

  // Usage — 7pt #000, word-wrapped, as many lines as fit
  let curY = y + 16;
  setDocFont(doc, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  const usageText = item.customUsage || item.drug.default_usage || '';
  const usageLines = doc.splitTextToSize(usageText, w);

  // Pre-calculate precaution space so we can cap usage lines
  const cautionText = item.customPrecautions || item.drug.default_precautions || '';
  const cautionOverhead = cautionText ? 1 + 3.3 * 2 : 0;  // gap (1) + up to 2 lines
  const usageLineH = 3.5;
  let maxUsageLines = Math.max(1, Math.floor((maxTextY - curY - cautionOverhead) / usageLineH));
  if (maxUsageLines > 3) maxUsageLines = 3;

  usageLines.slice(0, maxUsageLines).forEach((line: string) => {
    doc.text(line, x, curY);
    curY += usageLineH;
  });

  // Precautions — bold, red, 6.5pt, max 2 lines
  if (cautionText) {
    curY += 0.5;
    if (curY < maxTextY) {
      doc.setTextColor(180, 30, 30);
      setDocFont(doc, 'bold');
      doc.setFontSize(6.5);
      const cautionLines = doc.splitTextToSize(cautionText, w);
      const maxCL = Math.min(2, Math.max(1, Math.floor((maxTextY - curY) / 3.3)));
      cautionLines.slice(0, maxCL).forEach((line: string) => {
        doc.text(`⚠ ${line}`, x, curY);
        curY += 3.3;
      });
    }
  }

  // ── L4: Bottom bar ──────────────────────────────────────────
  // Address — far bottom, 5pt, #969696
  const addrY = y + h - 0.5;
  setDocFont(doc, 'normal');
  doc.setFontSize(5);
  doc.setTextColor(150, 150, 150);
  doc.text(trunc(item.pharmacy.address, 60, 58), x, addrY);

  // Patient name (bold, 8pt, left) + Date (6pt, right)
  const infoY = addrY - 4;
  setDocFont(doc, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(trunc(item.patientName, 25, 23), x, infoY);

  setDocFont(doc, 'normal');
  doc.setFontSize(6);
  doc.setTextColor(80, 80, 80);
  doc.text(item.date, x + w, infoY, { align: 'right' });
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
        doc.setFillColor(248, 248, 248);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
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
    doc.setTextColor(200, 200, 200);
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
