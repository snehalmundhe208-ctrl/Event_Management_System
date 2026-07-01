require('dotenv').config();
const app = require('./app');
const { bootstrapDatabase } = require('./config/bootstrap');

const PORT = process.env.PORT || 5000;

bootstrapDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to bootstrap database', error);
    process.exit(1);
  });
