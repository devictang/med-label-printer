import jsPDF from 'jspdf';
import { formatIngredientsDisplay } from '../components/IngredientEditor';
import { ensureCJKFont, registerCJKFont, setDocFont } from './pdfFont';
import type { LabelItem, LabelGridConfig } from '../types';

const A4_WIDTH = 210;  // mm
const A4_HEIGHT = 297; // mm

/** Draw a single label's content at the given position */
function drawLabel(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  item: LabelItem,
): void {
  // Label border
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, h);

  // Inner padding
  const pad = 2;
  const cx = x + pad;
  const cy = y + pad;
  const cw = w - pad * 2;

  // --- Pharmacy name (top-left, small) ---
  doc.setFontSize(6);
  setDocFont(doc, 'normal');
  doc.setTextColor(100, 100, 100);
  const pharmName = item.pharmacy.name.length > 30
    ? item.pharmacy.name.slice(0, 28) + '…'
    : item.pharmacy.name;
  doc.text(pharmName, cx, cy + 3);

  // --- HK number ---
  doc.setFontSize(5);
  doc.setTextColor(130, 130, 130);
  doc.text(`HK#: ${item.drug.hk_number}`, cx + cw, cy + 3, { align: 'right' });

  // --- Patient name (bold, prominent) ---
  setDocFont(doc, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const patientLabel = item.patientName.length > 25
    ? item.patientName.slice(0, 23) + '…'
    : item.patientName;
  doc.text(patientLabel, cx, cy + 8);

  // --- Date ---
  setDocFont(doc, 'normal');
  doc.setFontSize(6);
  doc.setTextColor(80, 80, 80);
  doc.text(item.date, cx + cw, cy + 8, { align: 'right' });

  // --- Drug name (brand + generic) ---
  setDocFont(doc, 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 50, 80);
  const drugLine = item.drug.brand_name;
  const truncatedDrug = drugLine.length > 38 ? drugLine.slice(0, 36) + '…' : drugLine;
  doc.text(truncatedDrug, cx, cy + 13.5);

  // --- Ingredient(s) ---
  setDocFont(doc, 'normal');
  doc.setFontSize(6);
  doc.setTextColor(50, 50, 50);
  const ingText = item.drug.ingredient
    ? formatIngredientsDisplay(item.drug.ingredient)
    : '';
  if (ingText) doc.text(ingText, cx, cy + 18);

  // --- Usage ---
  doc.setFontSize(5.5);
  doc.setTextColor(30, 30, 30);
  const usageText = item.customUsage || item.drug.default_usage;
  // Word-wrap usage text
  const usageLines = doc.splitTextToSize(usageText, cw);
  let usageY = cy + 22;
  const maxLines = 3;
  usageLines.slice(0, maxLines).forEach((line: string) => {
    doc.text(line, cx, usageY);
    usageY += 3.2;
  });

  // --- Precautions (if any) ---
  const cautionText = item.customPrecautions || item.drug.default_precautions;
  if (cautionText) {
    doc.setTextColor(180, 30, 30);
    setDocFont(doc, 'bold');
    doc.setFontSize(5);
    const cautionLines = doc.splitTextToSize(cautionText, cw);
    let cautionY = y + h - pad - cautionLines.length * 3 - 1;
    if (cautionY < usageY + 2) cautionY = usageY + 2;
    cautionLines.slice(0, 2).forEach((line: string) => {
      doc.text(`⚠ ${line}`, cx, cautionY);
      cautionY += 3;
    });
  }

  // --- Address line at bottom very small ---
  setDocFont(doc, 'normal');
  doc.setFontSize(4.5);
  doc.setTextColor(150, 150, 150);
  const addrText = item.pharmacy.address.length > 60
    ? item.pharmacy.address.slice(0, 58) + '…'
    : item.pharmacy.address;
  doc.text(addrText, cx, y + h - 1.5);
}

/** Calculate label positions based on grid config */
function getLabelPositions(
  config: LabelGridConfig,
  count: number,
): { x: number; y: number; w: number; h: number }[] {
  const positions: { x: number; y: number; w: number; h: number }[] = [];
  const totalSlots = config.cols * config.rows;

  for (let i = 0; i < Math.min(count, totalSlots); i++) {
    const col = i % config.cols;
    const row = Math.floor(i / config.cols);
    const x = config.marginLeft + col * (config.labelWidth + config.gapX);
    const y = config.marginTop + row * (config.labelHeight + config.gapY);
    positions.push({ x, y, w: config.labelWidth, h: config.labelHeight });
  }

  return positions;
}

/** Generate a PDF with labels. Returns the PDF as a Blob. */
export async function generateLabelPDF(
  items: LabelItem[],
  config: LabelGridConfig,
  includeEmptyGrid: boolean = true,
): Promise<Blob> {
  await ensureCJKFont();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  registerCJKFont(doc);

  const itemsPerPage = config.cols * config.rows;

  for (let pageIdx = 0; pageIdx < Math.ceil(items.length / itemsPerPage); pageIdx++) {
    if (pageIdx > 0) doc.addPage();

    const pageItems = items.slice(pageIdx * itemsPerPage, (pageIdx + 1) * itemsPerPage);
    const positions = getLabelPositions(config, includeEmptyGrid ? itemsPerPage : pageItems.length);

    // If showing empty grid, draw all labels but fill only those with data
    if (includeEmptyGrid) {
      // Draw empty grid outlines first
      const allPositions = getLabelPositions(config, itemsPerPage);
      allPositions.forEach((pos) => {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.rect(pos.x, pos.y, pos.w, pos.h);
        doc.setFillColor(248, 248, 248);
        doc.rect(pos.x, pos.y, pos.w, pos.h, 'F');
      });

      // Then draw filled labels on top
      pageItems.forEach((item, idx) => {
        const pos = positions[idx];
        drawLabel(doc, pos.x, pos.y, pos.w, pos.h, item);
      });
    } else {
      positions.forEach((pos, idx) => {
        if (idx < pageItems.length) {
          drawLabel(doc, pos.x, pos.y, pos.w, pos.h, pageItems[idx]);
        }
      });
    }

    // Add page label in very light gray
    doc.setFontSize(4);
    doc.setTextColor(200, 200, 200);
    doc.text(
      `藥物標籤列印系統 - 第 ${pageIdx + 1} 頁`,
      A4_WIDTH - 5,
      A4_HEIGHT - 3,
      { align: 'right' },
    );
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
  // Clean up after a delay
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
