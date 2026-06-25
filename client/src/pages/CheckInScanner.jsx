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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back to Dashboard
      </button>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900">Check-In Scanner</h2>
          <p className="mt-1 text-sm text-gray-600">Scan attendee QR ticket code or type ticket code manually.</p>
        </div>

        {status === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-start space-x-3 text-green-900">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Check-in Successful!</p>
              <p className="text-sm font-medium mt-1">Attendee: {attendee}</p>
              <p className="text-xs text-green-700 mt-1">{message}</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start space-x-3 text-red-900">
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Check-in Failed</p>
              <p className="text-sm mt-1">{message}</p>
            </div>
          </div>
        )}

        <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 p-6 flex flex-col items-center">
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
            <Video className="h-4 w-4 text-indigo-600" />
            <span>Active Camera Scanner</span>
          </div>
          <div id="qr-reader" className="w-full max-w-sm rounded overflow-hidden shadow-inner border border-gray-300"></div>
        </div>

        <form onSubmit={handleManualCheckIn} className="pt-6 border-t border-gray-200 space-y-3">
          <h3 className="text-sm font-bold text-gray-700">Manual Check-In</h3>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Enter Ticket Code (e.g. TIC-XXXXXXXX)"
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
            />
            <button
              type="submit"
              className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded text-sm transition-colors"
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
