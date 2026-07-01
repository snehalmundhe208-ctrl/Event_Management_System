const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const apiOrigin = new URL(apiBase).origin;

export const toAssetUrl = (value) => {
  if (!value) {
    return '';
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${apiOrigin}${value}`;
};
