import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { ArrowLeft, Download, Heart, Upload, Image as ImageIcon } from 'lucide-react';
import { toAssetUrl } from '../utils/assets';

export default function EventGallery() {
  const { eventId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const eventRes = await api.get(`/events/${eventId}`);
        if (cancelled) return;
        setEvent(eventRes.data);

        const params = user ? { userId: user.id } : {};
        const galleryRes = await api.get(`/gallery/event/${eventId}`, { params });
        if (cancelled) return;
        setItems(galleryRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
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
      const params = user ? { userId: user.id } : {};
      const galleryRes = await api.get(`/gallery/event/${eventId}`, { params });
      setItems(galleryRes.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Photo upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadExport = async (item, format) => {
    try {
      const endpoint = format === 'pdf' ? '/gallery/export/pdf' : '/gallery/export/jpeg';
      const extension = format === 'pdf' ? 'pdf' : 'jpg';
      const res = await api.get(endpoint, {
        params: {
          photoUrl: item.photo_url,
          filename: `gallery-${item.id}`,
          title: event?.title || 'Event Gallery'
        },
        responseType
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `gallery-${item.id}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.message || `Gallery ${format.toUpperCase()} export failed`);
    }
  };

  const handleLikeItem = async (itemId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await api.post(`/gallery/item/${itemId}/like`);
      const params = user ? { userId: user.id } : {};
      const galleryRes = await api.get(`/gallery/event/${eventId}`, { params });
      setItems(galleryRes.data);
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
        {user && (
          <div className="flex items-center space-x-3">
            <label className="btn-primary cursor-pointer">
              <Upload className="h-4 w-4" />
              <span>{uploading ? 'Uploading...' : 'Upload Photo'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploading}
              />
            </label>
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
                  src={toAssetUrl(item.photo_url)}
                  alt="Gallery content"
                  className="image-zoom h-56 w-full object-cover"
                />
              </div>
              <div className="flex items-center justify-between border-t border-border/60 p-4">
                <div className="min-w-0">
                  <span className="block max-w-[65%] truncate text-xs font-semibold text-muted">
                    By: {item.user_name}
                  </span>
                  <span className="mt-1 block text-[10px] uppercase tracking-[0.2em] text-muted/70">
                    {item.upload_phase || 'gallery'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {item.can_like && (
                    <button onClick={() => handleLikeItem(item.id)} className="flex items-center space-x-1.5 text-danger transition-all duration-300 hover:scale-105">
                      <Heart className={`h-4 w-4 ${item.is_liked ? 'fill-current' : ''}`} />
                      <span className="text-xs font-bold text-ink">{item.likes_count}</span>
                    </button>
                  )}
                  <button onClick={() => handleDownloadExport(item, 'pdf')} className="rounded-full bg-bg-soft p-2 text-muted transition-all duration-300 hover:bg-primary/8 hover:text-primary" title="Download PDF">
                    <Download className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDownloadExport(item, 'jpeg')} className="rounded-full bg-bg-soft p-2 text-muted transition-all duration-300 hover:bg-primary/8 hover:text-primary" title="Download JPEG">
                    <ImageIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
