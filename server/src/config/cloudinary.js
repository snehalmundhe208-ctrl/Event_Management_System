const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const isCloudinaryConfigured = () => Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const normalizeFolder = (folder) => {
  const value = String(folder || 'uploads')
    .replace(/\\/g, '/')
    .split('/')
    .filter((part) => part && part !== '.' && part !== '..')
    .map((part) => part.replace(/[^a-zA-Z0-9_-]/g, ''))
    .filter(Boolean)
    .join('/');
  return value || 'uploads';
};

const inferExtension = (meta) => {
  const fromMime = (meta?.mimetype || '').toLowerCase();
  if (fromMime === 'image/jpeg' || fromMime === 'image/jpg') return 'jpg';
  if (fromMime === 'image/png') return 'png';
  if (fromMime === 'image/gif') return 'gif';
  if (fromMime === 'image/webp') return 'webp';

  const original = (meta?.originalname || '').toLowerCase();
  const ext = original.includes('.') ? original.split('.').pop() : '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return ext === 'jpeg' ? 'jpg' : ext;
  return 'jpg';
};

const uploadToLocal = async (buffer, folder, meta) => {
  const normalized = normalizeFolder(folder);
  const extension = inferExtension(meta);
  const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  const relativePath = `${normalized}/${id}.${extension}`;
  const diskPath = path.join(__dirname, '../../uploads', ...relativePath.split('/'));
  await fs.mkdir(path.dirname(diskPath), { recursive: true });
  await fs.writeFile(diskPath, buffer);
  return `/uploads/${relativePath}`;
};

const uploadBuffer = (buffer, folder, meta = {}) => new Promise((resolve, reject) => {
  if (!isCloudinaryConfigured()) {
    uploadToLocal(buffer, folder, meta).then(resolve).catch(reject);
    return;
  }

  const stream = cloudinary.uploader.upload_stream(
    {
      folder,
      resource_type: 'image'
    },
    (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result.secure_url);
      }
    }
  );

  stream.end(buffer);
});

module.exports = {
  uploadBuffer
};
