const ticketsService = require('./tickets.service');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const getTicketDetails = async (req, res, next) => {
  try {
    const result = await ticketsService.getTicketDetails(req.params.id, req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const downloadTicketPdf = async (req, res, next) => {
  try {
    const ticket = await ticketsService.getTicketDetails(req.params.id, req.user.id);

    // Build QR code payload: JSON with ticketCode + hmac signature for verification
    const qrPayload = JSON.stringify({
      ticketCode: ticket.ticket_code,
      signature: ticket.hmac_signature
    });

    // Generate QR code as a PNG Buffer
    const qrImageBuffer = await QRCode.toBuffer(qrPayload, {
      errorCorrectionLevel: 'H',
      width: 200,
      margin: 2
    });

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticket.ticket_code}.pdf"`);

    doc.pipe(res);

    // ── Header ──
    doc
      .rect(0, 0, doc.page.width, 90)
      .fill('#4F46E5');

    doc
      .fillColor('#ffffff')
      .fontSize(28)
      .font('Helvetica-Bold')
      .text('EVENT TICKET', 50, 28, { align: 'center' });

    doc.moveDown(2.5);

    // ── Event Details ──
    const detailsX = 50;
    let y = 110;

    const drawField = (label, value) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#6B7280')
        .text(label.toUpperCase(), detailsX, y);
      doc
        .font('Helvetica')
        .fontSize(13)
        .fillColor('#111827')
        .text(value || '—', detailsX, y + 14);
      y += 42;
    };

    drawField('Event', ticket.event_title);
    drawField('Attendee', ticket.attendee_name);
    drawField('Date', new Date(ticket.start_date).toLocaleString());
    drawField('Location', ticket.location || 'Online');
    drawField('Type', ticket.event_type);

    // ── Divider ──
    doc
      .moveTo(50, y)
      .lineTo(doc.page.width - 50, y)
      .strokeColor('#E5E7EB')
      .lineWidth(1)
      .stroke();

    y += 20;

    // ── Ticket Code ──
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#6B7280')
      .text('TICKET CODE', detailsX, y);
    y += 14;
    doc
      .font('Courier-Bold')
      .fontSize(14)
      .fillColor('#4F46E5')
      .text(ticket.ticket_code, detailsX, y);

    // ── QR Code ──
    const qrX = doc.page.width - 50 - 130;
    const qrY = 110;
    doc.image(qrImageBuffer, qrX, qrY, { width: 130, height: 130 });
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#9CA3AF')
      .text('Scan to verify & check in', qrX, qrY + 135, { width: 130, align: 'center' });

    // ── Footer ──
    const footerY = doc.page.height - 60;
    doc
      .rect(0, footerY, doc.page.width, 60)
      .fill('#F9FAFB');
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#9CA3AF')
      .text('This ticket is valid for one-time entry only. Tampering invalidates the ticket.', 50, footerY + 20, {
        align: 'center',
        width: doc.page.width - 100
      });

    doc.end();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTicketDetails,
  downloadTicketPdf
};

