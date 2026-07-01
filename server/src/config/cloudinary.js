const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const ensureCloudinaryConfig = () => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    const error = new Error('Cloudinary environment variables are not configured');
    error.statusCode = 500;
    throw error;
  }
};

const uploadBuffer = (buffer, folder) => new Promise((resolve, reject) => {
  ensureCloudinaryConfig();

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
