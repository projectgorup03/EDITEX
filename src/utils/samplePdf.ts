import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Generates a crisp, multi-page sample PDF (Invoice & Service Agreement)
 * using pdf-lib for instant user testing.
 */
export async function createSamplePDF(): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.create();

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  // ================= PAGE 1: INVOICE =================
  const page1 = pdfDoc.addPage([595.28, 841.89]); // A4 in points
  const { width, height } = page1.getSize();

  // Primary Accent Header bar
  page1.drawRectangle({
    x: 0,
    y: height - 100,
    width,
    height: 100,
    color: rgb(0.08, 0.16, 0.32),
  });

  // Company Brand Name
  page1.drawText('VERTEX CLOUD SOLUTIONS', {
    x: 40,
    y: height - 55,
    size: 20,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  page1.drawText('Enterprise Cloud Architecture & Consulting', {
    x: 40,
    y: height - 75,
    size: 10,
    font: helvetica,
    color: rgb(0.8, 0.88, 0.98),
  });

  // Invoice Title
  page1.drawText('INVOICE', {
    x: width - 150,
    y: height - 55,
    size: 22,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  page1.drawText('#INV-2026-0891', {
    x: width - 150,
    y: height - 75,
    size: 10,
    font: helvetica,
    color: rgb(0.8, 0.88, 0.98),
  });

  // Invoice Metadata
  page1.drawText('Invoice Date: September 15, 2026', {
    x: 40,
    y: height - 135,
    size: 10,
    font: helveticaBold,
    color: rgb(0.2, 0.25, 0.3),
  });

  page1.drawText('Payment Due: October 15, 2026', {
    x: 40,
    y: height - 152,
    size: 10,
    font: helvetica,
    color: rgb(0.3, 0.35, 0.4),
  });

  // Billed To Box
  page1.drawRectangle({
    x: width - 260,
    y: height - 200,
    width: 220,
    height: 80,
    borderColor: rgb(0.85, 0.88, 0.92),
    borderWidth: 1,
    color: rgb(0.97, 0.98, 1.0),
  });

  page1.drawText('BILLED TO:', {
    x: width - 248,
    y: height - 140,
    size: 9,
    font: helveticaBold,
    color: rgb(0.15, 0.25, 0.45),
  });

  page1.drawText('Acme Global Enterprises, LLC', {
    x: width - 248,
    y: height - 158,
    size: 11,
    font: helveticaBold,
    color: rgb(0.1, 0.15, 0.2),
  });

  page1.drawText('450 Innovation Way, Suite 800', {
    x: width - 248,
    y: height - 173,
    size: 9,
    font: helvetica,
    color: rgb(0.35, 0.4, 0.45),
  });

  page1.drawText('San Francisco, CA 94105', {
    x: width - 248,
    y: height - 188,
    size: 9,
    font: helvetica,
    color: rgb(0.35, 0.4, 0.45),
  });

  // Table Header
  const tableTop = height - 235;
  page1.drawRectangle({
    x: 40,
    y: tableTop - 24,
    width: width - 80,
    height: 24,
    color: rgb(0.93, 0.95, 0.98),
  });

  page1.drawText('ITEM DESCRIPTION', {
    x: 52,
    y: tableTop - 16,
    size: 9,
    font: helveticaBold,
    color: rgb(0.2, 0.25, 0.35),
  });

  page1.drawText('QTY', {
    x: 340,
    y: tableTop - 16,
    size: 9,
    font: helveticaBold,
    color: rgb(0.2, 0.25, 0.35),
  });

  page1.drawText('UNIT PRICE', {
    x: 410,
    y: tableTop - 16,
    size: 9,
    font: helveticaBold,
    color: rgb(0.2, 0.25, 0.35),
  });

  page1.drawText('TOTAL', {
    x: width - 95,
    y: tableTop - 16,
    size: 9,
    font: helveticaBold,
    color: rgb(0.2, 0.25, 0.35),
  });

  // Table Items
  const items = [
    { desc: 'Cloud Infrastructure Audit & Security Hardening', qty: '1', price: '$4,200.00', total: '$4,200.00' },
    { desc: 'Multi-Region Kubernetes Cluster Deployment', qty: '2', price: '$3,400.00', total: '$6,800.00' },
    { desc: 'Automated CI/CD Pipeline Integration', qty: '1', price: '$2,150.00', total: '$2,150.00' },
    { desc: '24/7 Production Monitoring & SRE Support (Monthly)', qty: '1', price: '$1,850.00', total: '$1,850.00' },
  ];

  let currentY = tableTop - 50;
  items.forEach((item, index) => {
    // Row background zebra striping
    if (index % 2 === 1) {
      page1.drawRectangle({
        x: 40,
        y: currentY - 8,
        width: width - 80,
        height: 26,
        color: rgb(0.98, 0.99, 1.0),
      });
    }

    // Bottom border line
    page1.drawLine({
      start: { x: 40, y: currentY - 8 },
      end: { x: width - 40, y: currentY - 8 },
      thickness: 0.5,
      color: rgb(0.88, 0.9, 0.94),
    });

    page1.drawText(item.desc, {
      x: 52,
      y: currentY,
      size: 10,
      font: helvetica,
      color: rgb(0.15, 0.2, 0.25),
    });

    page1.drawText(item.qty, {
      x: 348,
      y: currentY,
      size: 10,
      font: helvetica,
      color: rgb(0.3, 0.35, 0.4),
    });

    page1.drawText(item.price, {
      x: 410,
      y: currentY,
      size: 10,
      font: helvetica,
      color: rgb(0.3, 0.35, 0.4),
    });

    page1.drawText(item.total, {
      x: width - 98,
      y: currentY,
      size: 10,
      font: helveticaBold,
      color: rgb(0.1, 0.15, 0.2),
    });

    currentY -= 32;
  });

  // Total summary block
  const summaryTop = currentY - 20;
  page1.drawText('Subtotal:', {
    x: width - 210,
    y: summaryTop,
    size: 10,
    font: helvetica,
    color: rgb(0.35, 0.4, 0.45),
  });
  page1.drawText('$15,000.00', {
    x: width - 98,
    y: summaryTop,
    size: 10,
    font: helveticaBold,
    color: rgb(0.1, 0.15, 0.2),
  });

  page1.drawText('Tax (8.5%):', {
    x: width - 210,
    y: summaryTop - 20,
    size: 10,
    font: helvetica,
    color: rgb(0.35, 0.4, 0.45),
  });
  page1.drawText('$1,275.00', {
    x: width - 98,
    y: summaryTop - 20,
    size: 10,
    font: helveticaBold,
    color: rgb(0.1, 0.15, 0.2),
  });

  page1.drawRectangle({
    x: width - 220,
    y: summaryTop - 60,
    width: 180,
    height: 32,
    color: rgb(0.08, 0.16, 0.32),
  });

  page1.drawText('TOTAL AMOUNT:', {
    x: width - 210,
    y: summaryTop - 48,
    size: 10,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  page1.drawText('$16,275.00', {
    x: width - 110,
    y: summaryTop - 50,
    size: 13,
    font: helveticaBold,
    color: rgb(1, 0.85, 0.4),
  });

  // Signatures Section
  const sigY = 130;
  page1.drawText('Authorized Signature', {
    x: 52,
    y: sigY,
    size: 10,
    font: helveticaBold,
    color: rgb(0.2, 0.25, 0.3),
  });

  page1.drawLine({
    start: { x: 52, y: sigY - 35 },
    end: { x: 230, y: sigY - 35 },
    thickness: 1,
    color: rgb(0.6, 0.65, 0.7),
  });

  page1.drawText('Johnathan C. Pierce, VP Engineering', {
    x: 52,
    y: sigY - 50,
    size: 9,
    font: helvetica,
    color: rgb(0.4, 0.45, 0.5),
  });

  // Client signature line
  page1.drawText('Client Acceptance', {
    x: width - 240,
    y: sigY,
    size: 10,
    font: helveticaBold,
    color: rgb(0.2, 0.25, 0.3),
  });

  page1.drawLine({
    start: { x: width - 240, y: sigY - 35 },
    end: { x: width - 52, y: sigY - 35 },
    thickness: 1,
    color: rgb(0.6, 0.65, 0.7),
  });

  page1.drawText('Signature & Date (Click or Draw to Sign)', {
    x: width - 240,
    y: sigY - 50,
    size: 9,
    font: helvetica,
    color: rgb(0.4, 0.45, 0.5),
  });

  // Page 1 footer
  page1.drawText('Page 1 of 2  •  Vertex Cloud Solutions  •  support@vertexcloud.example.com', {
    x: width / 2 - 160,
    y: 25,
    size: 8,
    font: helvetica,
    color: rgb(0.6, 0.65, 0.7),
  });

  // ================= PAGE 2: TERMS & CONDITIONS =================
  const page2 = pdfDoc.addPage([595.28, 841.89]);

  page2.drawRectangle({
    x: 0,
    y: height - 60,
    width,
    height: 60,
    color: rgb(0.08, 0.16, 0.32),
  });

  page2.drawText('TERMS OF SERVICE & SERVICE LEVEL AGREEMENT', {
    x: 40,
    y: height - 38,
    size: 13,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  const terms = [
    {
      title: '1. SCOPE OF SERVICES',
      body: 'Vertex Cloud Solutions shall perform the engineering and architecture advisory services described in this statement of work with professional care and skill consistent with current cloud security standards.',
    },
    {
      title: '2. PAYMENT TERMS & SCHEDULE',
      body: 'Invoices are payable within 30 days of the invoice date. Late payments may incur a finance charge of 1.5% per month or the maximum rate permitted by applicable law.',
    },
    {
      title: '3. INTELLECTUAL PROPERTY',
      body: 'All custom infrastructure automation scripts, Kubernetes manifests, and monitoring configurations developed specifically for the Client shall become the intellectual property of Acme Global Enterprises upon receipt of full payment.',
    },
    {
      title: '4. CONFIDENTIALITY & DATA SECURITY',
      body: 'Both parties agree to treat proprietary customer records, encryption keys, and architecture designs as confidential information and shall implement reasonable organizational and technical safeguards.',
    },
    {
      title: '5. WARRANTIES & LIMITATION OF LIABILITY',
      body: 'Except as expressly stated herein, services are provided as agreed. Total cumulative liability under this agreement shall not exceed total fees actually paid by Client in the preceding three months.',
    },
  ];

  let termY = height - 100;
  terms.forEach((t) => {
    page2.drawText(t.title, {
      x: 40,
      y: termY,
      size: 11,
      font: helveticaBold,
      color: rgb(0.12, 0.18, 0.3),
    });

    termY -= 18;

    // Wrap body text across lines
    const words = t.body.split(' ');
    let line = '';
    for (const w of words) {
      const testLine = line + (line ? ' ' : '') + w;
      if (testLine.length > 90) {
        page2.drawText(line, {
          x: 40,
          y: termY,
          size: 9.5,
          font: timesRoman,
          color: rgb(0.25, 0.3, 0.35),
        });
        line = w;
        termY -= 14;
      } else {
        line = testLine;
      }
    }
    if (line) {
      page2.drawText(line, {
        x: 40,
        y: termY,
        size: 9.5,
        font: timesRoman,
        color: rgb(0.25, 0.3, 0.35),
      });
      termY -= 26;
    }
  });

  // Page 2 footer
  page2.drawText('Page 2 of 2  •  Vertex Cloud Solutions  •  Confidential Agreement', {
    x: width / 2 - 140,
    y: 25,
    size: 8,
    font: helvetica,
    color: rgb(0.6, 0.65, 0.7),
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes.buffer as ArrayBuffer;
}

/**
 * Generates a purely flattened, image-based PDF document (scanned receipt & certificate)
 * with zero embedded vector text, specifically to test the automated OCR pipeline.
 */
export async function createFlattenedSamplePDF(): Promise<ArrayBuffer> {
  const canvas = document.createElement('canvas');
  const width = 1190;
  const height = 1684;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Vintage scanned paper tint
    ctx.fillStyle = '#fbfbfa';
    ctx.fillRect(0, 0, width, height);

    // Subtle scanned border
    ctx.strokeStyle = '#d4d4d8';
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // Scanned header banner
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(60, 60, width - 120, 110);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Helvetica, Arial, sans-serif';
    ctx.fillText('NOTARIZED AFFIDAVIT & CERTIFICATION', 100, 130);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '20px Helvetica, Arial, sans-serif';
    ctx.fillText('Document Control No: AC-2026-99042 • Official Record', 100, 155);

    // Body text
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px Georgia, serif';
    ctx.fillText('AFFIDAVIT OF COMPLIANCE AND IDENTITY VERIFICATION', 100, 240);

    ctx.font = '19px Georgia, serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('STATE OF CALIFORNIA   ) COUNTY OF SAN FRANCISCO ) SS.', 100, 280);

    ctx.font = '18px Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#1e293b';
    const lines = [
      'The undersigned affiant, having been first duly sworn according to law, deposes and states:',
      '1. That the individual referenced herein is authorized to execute enterprise agreements.',
      '2. All records submitted represent true, authentic, and complete historical documentation.',
      '3. Notice of verification has been served to all designated signatories pursuant to Section 4B.',
      '4. The effective term shall commence upon the date inscribed below and persist for 36 months.',
      '5. Any modifications must be executed in writing and filed with the custodian of records.',
    ];

    let y = 330;
    for (const l of lines) {
      ctx.fillText(l, 100, y);
      y += 45;
    }

    // Scanned data table
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(100, 620, width - 200, 200);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(100, 620, width - 200, 200);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px Helvetica, Arial, sans-serif';
    ctx.fillText('RECORD IDENTIFICATION PARTICULARS', 130, 660);

    ctx.font = '17px Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('Affiant Full Name: Alexandra Morgan Vance', 130, 700);
    ctx.fillText('Identification Number: DL-CA-99420188', 130, 735);
    ctx.fillText('Authorized Capacity: Chief Operations Officer', 130, 770);
    ctx.fillText('Verification Date: September 6, 2026', 600, 700);
    ctx.fillText('Status: Approved & Registered', 600, 735);
    ctx.fillText('Jurisdiction: California, USA', 600, 770);

    // Official Stamp / Seal simulation
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(300, 1100, 90, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.font = 'bold 16px Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#1d4ed8';
    ctx.fillText('NOTARY PUBLIC', 235, 1080);
    ctx.fillText('STATE OF CALIFORNIA', 215, 1105);
    ctx.fillText('SEAL OF OFFICE', 230, 1130);

    // Signatures area
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText('IN WITNESS WHEREOF, I have executed this document under official seal.', 100, 1300);

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, 1420);
    ctx.lineTo(450, 1420);
    ctx.stroke();

    ctx.font = '16px Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Authorized Signature (Affiant)', 100, 1445);

    ctx.beginPath();
    ctx.moveTo(600, 1420);
    ctx.lineTo(950, 1420);
    ctx.stroke();
    ctx.fillText('Attestation of Notary Public', 600, 1445);
  }

  // Convert canvas to PNG bytes
  const dataUrl = canvas.toDataURL('image/png');
  const base64Data = dataUrl.split(',')[1];
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const pngImage = await pdfDoc.embedPng(bytes);
  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: 595.28,
    height: 841.89,
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes.buffer as ArrayBuffer;
}
