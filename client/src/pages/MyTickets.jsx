import React, { useState, useEffect, useCallback } from 'react';
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

  const toggleQr = async (ticketId, ticketCode) => {
    // If already loaded, just toggle visibility
    if (ticketDetails[ticketId]) {
      setShowQr(prev => ({ ...prev, [ticketId]: !prev[ticketId] }));
      return;
    }
    try {
      const res = await api.get(`/tickets/${ticketId}`);
      const { ticket_code, hmac_signature } = res.data;
      const qrValue = JSON.stringify({ ticketCode: ticket_code, signature: hmac_signature });
      setTicketDetails(prev => ({ ...prev, [ticketId]: qrValue }));
      setShowQr(prev => ({ ...prev, [ticketId]: true }));
    } catch (err) {
      console.error('Could not load ticket QR', err);
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
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-gray-500">Loading registrations...</div>;
  }

  if (error) {
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-red-600 font-bold">{error}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">My Registrations & Tickets</h1>
        <p className="mt-2 text-gray-600">Access your tickets, view waitlist statuses, and download participation certificates.</p>
      </div>

      {registrations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow border border-gray-100 text-gray-500">
          You are not registered for any events yet.
        </div>
      ) : (
        <div className="space-y-6">
          {registrations.map((reg) => (
            <div key={reg.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row justify-between gap-6">
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{reg.event_title}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                      reg.status === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : reg.status === 'waitlisted'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {reg.status}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-500 text-sm space-x-4">
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
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Registered Team Members:</h4>
                    <ul className="list-disc pl-4 text-sm text-gray-700 space-y-1">
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
                    <div className="flex items-center space-x-2 bg-indigo-50 border border-indigo-100 rounded p-3 text-indigo-900 text-sm">
                      <Ticket className="h-5 w-5 text-indigo-600 mr-1.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="font-semibold">Ticket Code:</span> {reg.ticket_code}
                      </div>
                      <button
                        onClick={() => toggleQr(reg.ticket_id, reg.ticket_code)}
                        className="flex items-center space-x-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-2 py-1 rounded transition-colors"
                        title="Show / Hide QR Code"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span>{showQr[reg.ticket_id] ? 'Hide QR' : 'Show QR'}</span>
                      </button>
                    </div>
                    {showQr[reg.ticket_id] && ticketDetails[reg.ticket_id] && (
                      <div className="flex flex-col items-center bg-white border border-gray-200 rounded-lg p-4 shadow-inner">
                        <p className="text-xs text-gray-500 mb-3 text-center">Scan this QR code at the event entrance</p>
                        <QRCodeCanvas
                          value={ticketDetails[reg.ticket_id]}
                          size={160}
                          level="H"
                          includeMargin={true}
                          style={{ border: '4px solid #4F46E5', borderRadius: '8px' }}
                        />
                        <p className="mt-2 text-[10px] font-mono text-gray-500">{reg.ticket_code}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-center space-y-2 w-full md:w-56 flex-shrink-0">
                {reg.status === 'confirmed' && reg.ticket_id && (
                  <button
                    onClick={() => handleDownloadTicket(reg.ticket_id, reg.ticket_code)}
                    className="flex items-center justify-center space-x-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded text-sm transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Ticket PDF</span>
                  </button>
                )}

                {reg.status === 'confirmed' && reg.event_status === 'completed' && (
                  <button
                    onClick={() => handleDownloadCertificate(reg.event_id, reg.event_title)}
                    className="flex items-center justify-center space-x-2 w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded text-sm transition-colors"
                  >
                    <Award className="h-4 w-4" />
                    <span>Download Certificate</span>
                  </button>
                )}

                {reg.status === 'waitlisted' && (
                  <div className="flex items-start text-xs text-yellow-800 bg-yellow-50 border border-yellow-100 rounded p-3">
                    <AlertCircle className="h-4 w-4 mr-1.5 flex-shrink-0 text-yellow-600" />
                    <span>You are on the waitlist. You will be auto-promoted once confirmed registrants cancel.</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
