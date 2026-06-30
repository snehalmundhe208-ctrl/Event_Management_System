import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { ArrowLeft, Heart, Upload, Image as ImageIcon } from 'lucide-react';

export default function EventGallery() {
  const { eventId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [items, setItems] = useState([]);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDetails = async () => {
    try {
      const eventRes = await api.get(`/events/${eventId}`);
      setEvent(eventRes.data);

      const params = user ? { userId: user.id } : {};
      const galleryRes = await api.get(`/gallery/event/${eventId}`, { params });
      setItems(galleryRes.data);

      if (user) {
        const regRes = await api.get('/registrations/my');
        const reg = regRes.data.find(r => r.event_id === eventId);
        if (reg && reg.status === 'confirmed') {
          const ticketRes = await api.get(`/tickets/${reg.ticket_id}`);
          const checkinRes = await api.get(`/checkin/event/${eventId}`);
          const checked = checkinRes.data.some(c => c.ticket_code === ticketRes.data.ticket_code);
          setIsCheckedIn(checked);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [eventId, user]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('eventId', eventId);
    try {
      await api.post('/gallery', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Photo upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleLikeItem = async (itemId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await api.post(`/gallery/item/${itemId}/like`);
      fetchDetails();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-muted">Loading gallery...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 fade-in-section">
      <button
        onClick={() => navigate(`/event/${eventId}`)}
        className="mb-6 inline-flex items-center text-sm font-medium text-muted transition-all duration-300 hover:-translate-x-0.5 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back to Event
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Event Gallery</h1>
          <p className="mt-2 text-muted">Shared memories from: <span className="font-semibold text-primary">{event?.title}</span></p>
        </div>
        {isCheckedIn && (
          <div className="flex items-center space-x-3">
            <label className="btn-primary cursor-pointer">
              <Upload className="h-4 w-4" />
              <span>Upload Photo</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploading}
              />
            </label>
            {uploading && <span className="text-sm text-muted">Uploading...</span>}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card entrance-card py-16 text-center text-muted">
          <ImageIcon className="mx-auto mb-4 h-12 w-12 text-primary/30" />
          <p>No photos have been uploaded to this gallery yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {items.map((item) => (
            <div key={item.id} className="card-hover entrance-card group flex flex-col justify-between overflow-hidden rounded-[24px]">
              <div className="relative image-zoom-shell">
                <img
                  src={`http://localhost:5000${item.photo_url}`}
                  alt="Gallery content"
                  className="image-zoom h-56 w-full object-cover"
                />
              </div>
              <div className="flex items-center justify-between border-t border-border/60 p-4">
                <span className="max-w-[65%] truncate text-xs font-semibold text-muted">
                  By: {item.user_name}
                </span>
                <button
                  onClick={() => handleLikeItem(item.id)}
                  className="flex items-center space-x-1.5 text-danger transition-all duration-300 hover:scale-105"
                >
                  <Heart className={`h-4 w-4 ${item.is_liked ? 'fill-current' : ''}`} />
                  <span className="text-xs font-bold text-ink">{item.likes_count}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
