import { jsPDF } from 'jspdf';
import { Order } from '../types';

export const generateInvoicePDF = (order: Order): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header background bar
  doc.setFillColor(248, 245, 240); // Warm ivory spice background
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(26, 43, 76);
  doc.text('NA DISTRIBUTORS', 18, y);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(180, 83, 9);
  doc.text('Authorized Distributors for Vista Essentials Food Pvt Ltd, Bandaragama', 18, y + 6);
  doc.setTextColor(100, 116, 139);
  doc.text('Tax ID: NA-DIST-LK-2026 · Phone: +94 11 289 9450 · orders@nadistributors.lk', 18, y + 11);

  // INVOICE Header (Right side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(180, 83, 9); // Amber 700
  doc.text('COMMERCIAL INVOICE', pageWidth - 18, y, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(order.invoiceNumber, pageWidth - 18, y + 7, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Issue Date: ${order.orderDate}`, pageWidth - 18, y + 13, { align: 'right' });
  doc.text(`Due Date: ${order.dueDate}`, pageWidth - 18, y + 18, { align: 'right' });

  y = 52;

  // Bill To Box & Order Meta
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(18, y, 100, 36, 2, 2, 'FD');
  doc.roundedRect(125, y, pageWidth - 125 - 18, 36, 2, 2, 'FD');

  // Customer Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text('BILLED TO / CUSTOMER', 24, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(order.customerName, 24, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(order.customerAddress || 'Address on file', 24, y + 20);
  doc.text(`Contact: ${order.customerEmail || 'N/A'} · ${order.customerPhone || ''}`, 24, y + 26);
  doc.text(`Customer Tier: ${order.customerTier.toUpperCase()} PRICING`, 24, y + 32);

  // Order Details (Right Box)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text('PAYMENT DETAILS', 131, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Payment Terms: ${order.dueDate === order.orderDate ? 'Immediate' : 'Due on Date'}`, 131, y + 14);
  doc.text(`Payment Method: ${order.paymentMethod}`, 131, y + 20);
  doc.text(`Status: `, 131, y + 26);

  // Status badge
  doc.setFont('helvetica', 'bold');
  if (order.paymentStatus === 'Paid') {
    doc.setTextColor(22, 163, 74); // green
  } else if (order.paymentStatus === 'Overdue') {
    doc.setTextColor(220, 38, 38); // red
  } else {
    doc.setTextColor(217, 119, 6); // amber
  }
  doc.text(order.paymentStatus.toUpperCase(), 145, y + 26);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Order Status: ${order.orderStatus}`, 131, y + 32);

  y = 96;

  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(18, y, pageWidth - 36, 9, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(18, y + 9, pageWidth - 18, y + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('ITEM / SPICE DESCRIPTION', 22, y + 6);
  doc.text('SKU', 88, y + 6);
  doc.text('QTY / UNIT', 118, y + 6);
  doc.text('RATE (LKR)', 146, y + 6, { align: 'right' });
  doc.text('AMOUNT (LKR)', pageWidth - 22, y + 6, { align: 'right' });

  y += 12;

  // Table Rows
  order.items.forEach((item, index) => {
    // Alternate row bg
    if (index % 2 === 1) {
      doc.setFillColor(249, 250, 251);
      doc.rect(18, y - 4, pageWidth - 36, 9, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    // Truncate name if too long
    const cleanName = item.productName.length > 36 ? item.productName.substring(0, 34) + '...' : item.productName;
    doc.text(cleanName, 22, y + 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(item.sku, 88, y + 2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(`${item.quantity} ${item.unit.replace('_', ' ')}`, 118, y + 2);

    doc.text(`Rs. ${item.unitPrice.toFixed(2)}`, 146, y + 2, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text(`Rs. ${item.totalPrice.toFixed(2)}`, pageWidth - 22, y + 2, { align: 'right' });

    y += 9;
  });

  // Table bottom line
  doc.setDrawColor(203, 213, 225);
  doc.line(18, y, pageWidth - 18, y);

  y += 6;

  // Summary box on right side
  const summaryX = 115;
  const summaryWidth = pageWidth - 18 - summaryX;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  doc.text('Subtotal:', summaryX, y + 4);
  doc.text(`LKR ${order.subtotal.toFixed(2)}`, pageWidth - 22, y + 4, { align: 'right' });

  if (order.discountAmount > 0) {
    y += 6;
    doc.text(`Tier Discount (${order.discountPercentage}%):`, summaryX, y + 4);
    doc.setTextColor(22, 163, 74);
    doc.text(`-LKR ${order.discountAmount.toFixed(2)}`, pageWidth - 22, y + 4, { align: 'right' });
    doc.setTextColor(71, 85, 105);
  }

  if (order.taxAmount > 0) {
    y += 6;
    doc.text(`Sales Tax / VAT (${order.taxRate}%):`, summaryX, y + 4);
    doc.text(`LKR ${order.taxAmount.toFixed(2)}`, pageWidth - 22, y + 4, { align: 'right' });
  }

  y += 7;
  doc.setFillColor(241, 245, 249);
  doc.rect(summaryX - 4, y, summaryWidth + 4, 10, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Total Invoice Due:', summaryX, y + 7);
  doc.text(`LKR ${order.totalAmount.toFixed(2)}`, pageWidth - 22, y + 7, { align: 'right' });

  if (order.paidAmount > 0) {
    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Amount Paid:', summaryX, y + 4);
    doc.setTextColor(22, 163, 74);
    doc.text(`LKR ${order.paidAmount.toFixed(2)}`, pageWidth - 22, y + 4, { align: 'right' });

    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    const balanceRemaining = Math.max(0, order.totalAmount - order.paidAmount);
    doc.text('Balance Outstanding:', summaryX, y + 4);
    doc.text(`LKR ${balanceRemaining.toFixed(2)}`, pageWidth - 22, y + 4, { align: 'right' });
  }

  // Left side notes & wire instructions
  const notesY = y - 24;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('BANKING & REMITTANCE DETAILS (SRI LANKA)', 18, notesY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Bank: Commercial Bank of Ceylon PLC', 18, notesY + 5);
  doc.text('Account: 8004-9921-3401 (Current A/C) · Branch: Colombo Central', 18, notesY + 10);
  doc.text('Please quote invoice number on bank transfer advice slip.', 18, notesY + 15);

  if (order.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('ORDER NOTES & CERTIFICATES', 18, notesY + 23);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(order.notes, 18, notesY + 28, { maxWidth: 90 });
  }

  // Footer Certificate
  doc.setDrawColor(226, 232, 240);
  doc.line(18, 275, pageWidth - 18, 275);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Certified spice packet batch from Vista Essentials Food Pvt Ltd, Bandaragama. Distributed by NA Distributors. Thank you for your partnership.',
    pageWidth / 2,
    282,
    { align: 'center' }
  );

  doc.save(`${order.invoiceNumber}_NADistributors.pdf`);
};
