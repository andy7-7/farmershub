const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { ensureSchema } = require('./config/schema');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));
app.use('/admin', express.static(path.join(__dirname, '..', 'frontend', 'admin')));

// Routes
const authRoutes = require('./Routes/authRoutes');
const animalRoutes = require('./Routes/animalRoutes');
const farmerRoutes = require('./Routes/farmerRoutes');
const associationRoutes = require('./Routes/associationRoutes');
const adminRoutes = require('./Routes/adminRoutes');
const messageRoutes = require('./Routes/messageRoutes');
const verificationRoutes = require('./Routes/verificationRoutes');
const { renderVerificationPage } = require('./controllers/verificationController');

app.use('/api/auth', authRoutes);
app.use('/api/animals', animalRoutes);
app.use('/api/farmers', farmerRoutes);
app.use('/api/association', associationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/verify', verificationRoutes);

app.get('/verify/:membershipId', renderVerificationPage);

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'admin', 'login.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'admin', 'dashboard.html'));
});

app.get('/admin/farmers', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'admin', 'farmers.html'));
});

app.get('/admin/membership-cards', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'admin', 'membership-cards.html'));
});

app.get('/', (req, res) => {
  res.json({ message: 'Farmers Marketplace API is running!' });
});

const PORT = process.env.PORT || 5000;
ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database schema:', error);
    process.exit(1);
  });
