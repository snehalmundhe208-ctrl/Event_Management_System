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
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-gray-500">Loading gallery...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(`/event/${eventId}`)}
        className="flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back to Event
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Event Gallery</h1>
          <p className="mt-2 text-gray-600">Shared memories from: <span className="font-semibold text-indigo-600">{event?.title}</span></p>
        </div>
        {isCheckedIn && (
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium text-sm cursor-pointer transition-colors">
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
            {uploading && <span className="text-sm text-gray-500">Uploading...</span>}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-100 text-gray-500">
          <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p>No photos have been uploaded to this gallery yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 group flex flex-col justify-between">
              <div className="relative">
                <img
                  src={`http://localhost:5000${item.photo_url}`}
                  alt="Gallery content"
                  className="w-full h-56 object-cover"
                />
              </div>
              <div className="p-4 flex items-center justify-between border-t border-gray-50">
                <span className="text-xs font-semibold text-gray-500 truncate max-w-[65%]">
                  By: {item.user_name}
                </span>
                <button
                  onClick={() => handleLikeItem(item.id)}
                  className="flex items-center space-x-1.5 text-red-500 hover:scale-105 transition-transform"
                >
                  <Heart className={`h-4 w-4 ${item.is_liked ? 'fill-current' : ''}`} />
                  <span className="text-xs font-bold text-gray-700">{item.likes_count}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}