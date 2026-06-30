import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../api';
import { ArrowLeft, CheckCircle, XCircle, Send, Video } from 'lucide-react';

export default function CheckInScanner() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [manualCode, setManualCode] = useState('');
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [attendee, setAttendee] = useState('');

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('qr-reader', {
      fps: 10,
      qrbox: 250
    });

    const onScanSuccess = async (decodedText) => {
      setStatus(null);
      setMessage('');
      setAttendee('');
      try {
        let payload;
        try {
          payload = JSON.parse(decodedText);
        } catch (e) {
          payload = { ticketCode: decodedText };
        }

        if (payload.ticketCode && payload.signature) {
          const res = await api.post('/checkin/scan', {
            ticketCode: payload.ticketCode,
            signature: payload.signature
          });
          setStatus('success');
          setAttendee(res.data.attendeeName);
          setMessage(`Scanned Code: ${res.data.ticketCode}`);
        } else {
          const res = await api.post('/checkin/manual', {
            ticketCode: payload.ticketCode || decodedText
          });
          setStatus('success');
          setAttendee(res.data.attendeeName);
          setMessage(`Manual Code: ${res.data.ticketCode}`);
        }
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Check-in failed');
      }
    };

    const onScanError = (err) => {
      // Quietly ignore scan matching errors
    };

    scanner.render(onScanSuccess, onScanError);

    return () => {
      scanner.clear().catch(err => console.error('Failed to clear scanner', err));
    };
  }, [eventId]);

  const handleManualCheckIn = async (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    setStatus(null);
    setMessage('');
    setAttendee('');
    try {
      const res = await api.post('/checkin/manual', {
        ticketCode: manualCode.trim()
      });
      setStatus('success');
      setAttendee(res.data.attendeeName);
      setMessage(`Checked in code: ${res.data.ticketCode}`);
      setManualCode('');
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Check-in failed');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8 fade-in-section">
      <button
        onClick={() => navigate('/dashboard')}
        className="mb-6 inline-flex items-center text-sm font-medium text-muted transition-all duration-300 hover:-translate-x-0.5 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back to Dashboard
      </button>

      <div className="card entrance-card space-y-6 p-6">
        <div>
          <h2 className="text-2xl font-extrabold text-ink">Check-In Scanner</h2>
          <p className="mt-1 text-sm text-muted">Scan attendee QR ticket code or type ticket code manually.</p>
        </div>

        {status === 'success' && (
          <div className="flex items-start space-x-3 rounded-2xl border border-success/20 bg-success/10 p-4 text-success">
            <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" />
            <div>
              <p className="font-bold text-sm">Check-in Successful!</p>
              <p className="text-sm font-medium mt-1">Attendee: {attendee}</p>
              <p className="mt-1 text-xs text-success">{message}</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-start space-x-3 rounded-2xl border border-danger/20 bg-danger/10 p-4 text-danger">
            <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-danger" />
            <div>
              <p className="font-bold text-sm">Check-in Failed</p>
              <p className="text-sm mt-1">{message}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center overflow-hidden rounded-[26px] border border-border bg-bg-soft p-6">
          <div className="mb-4 flex items-center space-x-2 text-sm text-muted">
            <Video className="h-4 w-4 text-primary" />
            <span>Active Camera Scanner</span>
          </div>
          <div id="qr-reader" className="w-full max-w-sm overflow-hidden rounded-[22px] border border-border bg-surface shadow-inner"></div>
        </div>

        <form onSubmit={handleManualCheckIn} className="space-y-3 border-t border-border pt-6">
          <h3 className="text-sm font-bold text-ink">Manual Check-In</h3>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Enter Ticket Code (e.g. TIC-XXXXXXXX)"
              className="input-base flex-1"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
            />
            <button
              type="submit"
              className="btn-primary"
            >
              <Send className="h-4 w-4 mr-1.5" />
              <span>Verify Code</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
