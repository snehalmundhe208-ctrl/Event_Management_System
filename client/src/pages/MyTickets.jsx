import React, { useState, useEffect } from 'react';
import api from '../api';
import { QRCodeCanvas } from 'qrcode.react';
import { Ticket, Award, Calendar, MapPin, Download, AlertCircle, QrCode } from 'lucide-react';

export default function MyTickets() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ticketDetails, setTicketDetails] = useState({}); // { [ticketId]: { ticketCode, signature } }
  const [showQr, setShowQr] = useState({}); // { [ticketId]: bool }

  const fetchRegistrations = async () => {
    try {
      const res = await api.get('/registrations/my');
      setRegistrations(res.data);
    } catch (err) {
      setError('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const ensureTicketQrValue = async (ticketId) => {
    if (ticketDetails[ticketId]) {
      return ticketDetails[ticketId];
    }

    try {
      const res = await api.get(`/tickets/${ticketId}`);
      const { ticket_code, hmac_signature } = res.data;
      const qrValue = JSON.stringify({ ticketCode: ticket_code, signature: hmac_signature });
      setTicketDetails((prev) => ({ ...prev, [ticketId]: qrValue }));
      return qrValue;
    } catch (err) {
      console.error('Could not load ticket QR', err);
      return null;
    }
  };

  const toggleQr = async (ticketId) => {
    if (ticketDetails[ticketId]) {
      setShowQr((prev) => ({ ...prev, [ticketId]: !prev[ticketId] }));
      return;
    }

    const qrValue = await ensureTicketQrValue(ticketId);
    if (qrValue) {
      setShowQr((prev) => ({ ...prev, [ticketId]: true }));
    }
  };

  const handleDownloadTicket = async (ticketId, ticketCode) => {
    try {
      const res = await api.get(`/tickets/${ticketId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ticket-${ticketCode}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert('Could not download ticket PDF.');
    }
  };

  const handleDownloadTicketJpeg = async (registration) => {
    const qrValue = await ensureTicketQrValue(registration.ticket_id);
    if (!qrValue) {
      alert('Could not prepare ticket JPEG.');
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 0));

    const qrCanvas = document.getElementById(`hidden-qr-${registration.ticket_id}`);
    if (!qrCanvas) {
      alert('Ticket QR is still loading. Try again.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 700;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#5D3891';
    ctx.fillRect(0, 0, canvas.width, 120);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 46px Arial';
    ctx.fillText('EVENT TICKET', 420, 72);

    ctx.fillStyle = '#111827';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('Event', 80, 180);
    ctx.fillText('Date', 80, 280);
    ctx.fillText('Location', 80, 380);
    ctx.fillText('Ticket Code', 80, 480);

    ctx.font = '28px Arial';
    ctx.fillText(registration.event_title, 80, 220);
    ctx.fillText(new Date(registration.start_date).toLocaleString(), 80, 320);
    ctx.fillText(registration.location || 'Online', 80, 420);
    ctx.fillStyle = '#5D3891';
    ctx.font = 'bold 34px monospace';
    ctx.fillText(registration.ticket_code, 80, 525);

    ctx.fillStyle = '#111827';
    ctx.font = '18px Arial';
    ctx.fillText(`Status: ${registration.status}`, 80, 590);

    ctx.drawImage(qrCanvas, 840, 170, 260, 260);
    ctx.font = '16px Arial';
    ctx.fillText('Scan to verify entry', 885, 460);

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.download = `ticket-${registration.ticket_code}.jpg`;
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  };

  const handleDownloadCertificate = async (eventId, eventTitle) => {
    try {
      const res = await api.get(`/events/${eventId}/certificate/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate-${eventId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert('Certificate not available. Make sure the event is completed and you checked in.');
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-muted">Loading registrations...</div>;
  }

  if (error) {
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center font-bold text-danger">{error}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 fade-in-section">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">My Registrations & Tickets</h1>
        <p className="mt-2 text-muted">Access your tickets, view waitlist statuses, and download participation certificates.</p>
      </div>

      {registrations.length === 0 ? (
        <div className="card entrance-card py-12 text-center text-muted">
          You are not registered for any events yet.
        </div>
      ) : (
        <div className="space-y-6">
          {registrations.map((reg) => (
            <div key={reg.id} className="card entrance-card flex flex-col justify-between gap-6 p-6 md:flex-row">
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-bold text-ink">{reg.event_title}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                      reg.status === 'confirmed'
                        ? 'bg-success/12 text-success'
                        : reg.status === 'waitlisted'
                        ? 'bg-accent/12 text-accent'
                        : 'bg-bg-soft text-muted'
                    }`}>
                      {reg.status}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1.5" />
                      <span>{new Date(reg.start_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1.5" />
                      <span>{reg.location || 'Online'}</span>
                    </div>
                  </div>
                </div>

                {reg.members && reg.members.length > 0 && (
                  <div className="rounded-2xl border border-border bg-bg-soft p-4">
                    <h4 className="mb-2 text-xs font-semibold uppercase text-muted">Registered Team Members:</h4>
                    <ul className="list-disc space-y-1 pl-4 text-sm text-ink">
                      {reg.members.map((m, idx) => (
                        <li key={idx}>
                          {m.name} ({m.email})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {reg.status === 'confirmed' && reg.ticket_code && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 rounded-2xl border border-primary/18 bg-primary/10 p-3 text-sm text-ink">
                      <Ticket className="mr-1.5 h-5 w-5 flex-shrink-0 text-primary" />
                      <div className="flex-1">
                        <span className="font-semibold">Ticket Code:</span> {reg.ticket_code}
                      </div>
                      <button
                        onClick={() => toggleQr(reg.ticket_id)}
                        className="flex items-center space-x-1 rounded-full border border-primary/20 bg-white px-2 py-1 text-xs font-semibold text-primary transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/8"
                        title="Show / Hide QR Code"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span>{showQr[reg.ticket_id] ? 'Hide QR' : 'Show QR'}</span>
                      </button>
                    </div>
                    {showQr[reg.ticket_id] && ticketDetails[reg.ticket_id] && (
                      <div className="flex flex-col items-center rounded-[24px] border border-border bg-surface p-4 shadow-inner animate-soft-pop">
                        <p className="mb-3 text-center text-xs text-muted">Scan this QR code at the event entrance</p>
                        <QRCodeCanvas
                          value={ticketDetails[reg.ticket_id]}
                          size={160}
                          level="H"
                          includeMargin={true}
                          style={{ border: '4px solid #5D3891', borderRadius: '12px' }}
                        />
                        <p className="mt-2 text-[10px] font-mono text-muted">{reg.ticket_code}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-center space-y-2 w-full md:w-56 flex-shrink-0">
                {reg.status === 'confirmed' && reg.ticket_id && (
                  <button
                    onClick={() => handleDownloadTicket(reg.ticket_id, reg.ticket_code)}
                    className="btn-primary w-full"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Ticket PDF</span>
                  </button>
                )}

                {reg.status === 'confirmed' && reg.ticket_id && (
                  <button onClick={() => handleDownloadTicketJpeg(reg)} className="btn-outline w-full">
                    <Download className="h-4 w-4" />
                    <span>Download Ticket JPEG</span>
                  </button>
                )}

                {reg.status === 'confirmed' && reg.event_status === 'completed' && (
                  <button
                    onClick={() => handleDownloadCertificate(reg.event_id, reg.event_title)}
                    className="flex w-full items-center justify-center space-x-2 rounded-2xl bg-success px-4 py-2 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-success/90"
                  >
                    <Award className="h-4 w-4" />
                    <span>Download Certificate</span>
                  </button>
                )}

                {reg.status === 'waitlisted' && (
                  <div className="flex items-start rounded-2xl border border-accent/20 bg-accent/10 p-3 text-xs text-accent">
                    <AlertCircle className="mr-1.5 h-4 w-4 flex-shrink-0 text-accent" />
                    <span>You are on the waitlist. You will be auto-promoted once confirmed registrants cancel.</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="absolute left-[-9999px] top-[-9999px]">
        {registrations.filter((reg) => reg.status === 'confirmed' && ticketDetails[reg.ticket_id]).map((reg) => (
          <QRCodeCanvas
            key={`hidden-qr-${reg.ticket_id}`}
            id={`hidden-qr-${reg.ticket_id}`}
            value={ticketDetails[reg.ticket_id]}
            size={240}
            level="H"
            includeMargin={true}
          />
        ))}
      </div>
    </div>
  );
}
