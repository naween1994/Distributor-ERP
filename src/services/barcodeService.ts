import QRCode from 'qrcode';
import { Product } from '../types';

export const BarcodeService = {
  /**
   * Generates a data URL for a product QR Code containing structured provenance data
   */
  async generateProductQR(product: Product): Promise<string> {
    const payload = JSON.stringify({
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      origin: product.origin,
      lot: product.batchNumber,
      unit: product.unit,
      grade: product.grade,
    });

    try {
      return await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 256,
        color: {
          dark: '#1e293b',
          light: '#ffffff',
        },
      });
    } catch (err) {
      console.error('Failed to generate QR code', err);
      return '';
    }
  },

  /**
   * Generates a simple SKU or text QR code data URL
   */
  async generateTextQR(text: string): Promise<string> {
    try {
      return await QRCode.toDataURL(text, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 200,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
    } catch {
      return '';
    }
  },

  /**
   * Parses scanned text from either:
   * 1. A JSON QR string ({ sku: "..." })
   * 2. A raw Barcode number (e.g. "890100200101")
   * 3. A raw SKU string (e.g. "CIN-CEY-001")
   */
  matchProduct(scannedValue: string, products: Product[]): Product | undefined {
    const cleaned = scannedValue.trim();

    // 1. Try parsing as JSON QR
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.sku) {
        const found = products.find((p) => p.sku === parsed.sku);
        if (found) return found;
      }
      if (parsed.barcode) {
        const found = products.find((p) => p.barcode === parsed.barcode);
        if (found) return found;
      }
    } catch {
      // Not JSON, continue
    }

    // 2. Direct match by barcode
    const matchBarcode = products.find((p) => p.barcode === cleaned);
    if (matchBarcode) return matchBarcode;

    // 3. Direct match by SKU
    const matchSku = products.find((p) => p.sku.toLowerCase() === cleaned.toLowerCase());
    if (matchSku) return matchSku;

    // 4. Partial SKU or name match fallback
    return products.find(
      (p) =>
        p.sku.toLowerCase().includes(cleaned.toLowerCase()) ||
        p.barcode.includes(cleaned) ||
        p.name.toLowerCase().includes(cleaned.toLowerCase())
    );
  },

  /**
   * Generates an authentic Code-128 style SVG Barcode
   */
  generateBarcodeSVG(code: string, width = 240, height = 70): string {
    // Generate deterministic bar widths based on char codes
    const bars: Array<{ x: number; w: number }> = [];
    let curX = 10;

    // Start guard
    bars.push({ x: curX, w: 2 });
    curX += 4;
    bars.push({ x: curX, w: 2 });
    curX += 4;

    for (let i = 0; i < code.length; i++) {
      const charCode = code.charCodeAt(i);
      const w1 = (charCode % 3) + 1;
      const space1 = ((charCode >> 1) % 2) + 2;
      const w2 = ((charCode >> 2) % 3) + 1;
      const space2 = 2;

      bars.push({ x: curX, w: w1 });
      curX += w1 + space1;
      bars.push({ x: curX, w: w2 });
      curX += w2 + space2;
    }

    // End guard
    bars.push({ x: curX, w: 2 });
    curX += 4;
    bars.push({ x: curX, w: 2 });
    curX += 10;

    const barHeight = height - 20;
    const rects = bars
      .map((b) => `<rect x="${b.x}" y="5" width="${b.w}" height="${barHeight}" fill="#0f172a" />`)
      .join('');

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${curX} ${height}" width="${width}" height="${height}">
        <rect width="${curX}" height="${height}" fill="#ffffff" />
        ${rects}
        <text x="${curX / 2}" y="${height - 4}" font-family="monospace" font-size="11" font-weight="600" text-anchor="middle" fill="#334155" letter-spacing="2">
          ${code}
        </text>
      </svg>
    `;
  },
};
