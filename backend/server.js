require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const supabase = require('./supabase');
const { pool, initDb } = require('./db');

const app = express();
const PORT = 5000;

const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  }
});

// Allow up to 50 files per bulk request, 5MB each
const bulkUpload = multer({
  storage: multer.memoryStorage(),
 limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  }
}).array('images', 50);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function requireAdmin(req, res, next) {
  const pwd = req.headers['x-admin-password'];
  if (pwd !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ===== HEALTH =====
app.get('/', (req, res) => res.json({ status: 'ok' }));
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

// ===== ADMIN LOGIN =====
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) res.json({ success: true });
  else res.status(401).json({ error: 'Wrong password' });
});

// ==================== PHOTOS ====================

app.get('/api/photos', async (req, res) => {
  try {
    const { category } = req.query;
    let result;
    if (category && category !== 'all') {
      result = await pool.query(
        'SELECT * FROM photos WHERE category = $1 ORDER BY created_at DESC',
        [category]
      );
    } else {
      result = await pool.query('SELECT * FROM photos ORDER BY created_at DESC');
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/photos', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image required' });
    const { title, category, description } = req.body;
    if (!title || !category) {
      return res.status(400).json({ error: 'Title and category required' });
    }

    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('work-photos')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('work-photos')
      .getPublicUrl(fileName);

    const insert = await pool.query(
      'INSERT INTO photos (title, category, description, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, category, description || '', urlData.publicUrl]
    );

    res.json(insert.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/photos/:id', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM photos WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const url = result.rows[0].image_url;
    const fileName = url.split('/').pop();
    await supabase.storage.from('work-photos').remove([fileName]);

    await pool.query('DELETE FROM photos WHERE id = $1', [req.params.id]);
    res.json({ message: 'Photo deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk upload photos
app.post('/api/photos/bulk', requireAdmin, (req, res) => {
  bulkUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { category, titlePrefix } = req.body;
    if (!category) {
      return res.status(400).json({ error: 'Category required' });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      try {
        const fileExt = file.originalname.split('.').pop();
        const baseName = file.originalname.replace(/\.[^/.]+$/, '').substring(0, 40);
        const fileName = `${Date.now()}-${i}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('work-photos')
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('work-photos')
          .getPublicUrl(fileName);

        const title = titlePrefix
          ? `${titlePrefix} ${i + 1}`
          : baseName || `${category} ${i + 1}`;

        const insert = await pool.query(
          'INSERT INTO photos (title, category, description, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
          [title, category, '', urlData.publicUrl]
        );

        results.push(insert.rows[0]);
      } catch (uploadErr) {
        console.error('Failed:', file.originalname, uploadErr.message);
        errors.push({ file: file.originalname, error: uploadErr.message });
      }
    }

    res.json({
      uploaded: results.length,
      failed: errors.length,
      photos: results,
      errors
    });
  });
});

// ==================== PRICING ====================

// ==================== PRICING ====================

app.get('/api/pricing', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pricing ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get pricing for a specific service
app.get('/api/pricing/:service', async (req, res) => {
  try {
    const service = req.params.service;
    const result = await pool.query(
      'SELECT * FROM pricing WHERE $1 = ANY(services) ORDER BY id',
      [service]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pricing', requireAdmin, async (req, res) => {
  try {
    const { material, price_per_kg, services } = req.body;
    if (!material || price_per_kg == null || !services || services.length === 0) {
      return res.status(400).json({ error: 'All fields required' });
    }
    const existing = await pool.query('SELECT id FROM pricing WHERE material = $1', [material]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Material already exists' });
    }
    const result = await pool.query(
      'INSERT INTO pricing (material, price_per_kg, services) VALUES ($1, $2, $3) RETURNING *',
      [material, parseFloat(price_per_kg), services]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/pricing/:id', requireAdmin, async (req, res) => {
  try {
    const { material, price_per_kg, services } = req.body;
    if (!material || price_per_kg == null || !services || services.length === 0) {
      return res.status(400).json({ error: 'All fields required' });
    }
    await pool.query(
      'UPDATE pricing SET material = $1, price_per_kg = $2, services = $3 WHERE id = $4',
      [material, parseFloat(price_per_kg), services, req.params.id]
    );
    res.json({ message: 'Pricing updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/pricing/:id', requireAdmin, async (req, res) => {
  try {
    const count = await pool.query('SELECT COUNT(*) FROM pricing');
    if (parseInt(count.rows[0].count) <= 1) {
      return res.status(400).json({ error: 'At least one material required' });
    }
    await pool.query('DELETE FROM pricing WHERE id = $1', [req.params.id]);
    res.json({ message: 'Material deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== CALCULATOR ====================

// Config: which services have a units field
const SERVICE_CONFIG = {
  stairs:    { hasUnits: false, unitLabel: '' },
  gates:     { hasUnits: false, unitLabel: '' },
  doors:     { hasUnits: true,  unitLabel: 'Number of Doors' },
  windows:   { hasUnits: true,  unitLabel: 'Number of Windows' },
  fencing:   { hasUnits: true,  unitLabel: 'Number of Units' },
  shutters:  { hasUnits: false, unitLabel: '' },
  sheds:     { hasUnits: false, unitLabel: '' }
};

app.get('/api/services', (req, res) => {
  res.json(SERVICE_CONFIG);
});

app.post('/api/calculate', async (req, res) => {
  try {
    const { service, material, weight, units, includeInstallation } = req.body;

    if (!service || !material) {
      return res.status(400).json({ error: 'Service and material required' });
    }

    const config = SERVICE_CONFIG[service];
    if (!config) {
      return res.status(400).json({ error: 'Invalid service' });
    }

    // Check material is available for this service
    const result = await pool.query(
      'SELECT * FROM pricing WHERE material = $1 AND $2 = ANY(services)',
      [material, service]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material not available for this service' });
    }

    const row = result.rows[0];
    const w = parseFloat(weight) || 0;
    const u = config.hasUnits ? (parseInt(units) || 0) : 1;

    // If units field is shown, weight is per unit
    const totalWeight = config.hasUnits ? w * u : w;
    const weightCost = totalWeight * parseFloat(row.price_per_kg);

    const installation = includeInstallation ? weightCost * 0.15 : 0;
    const subtotal = weightCost + installation;
    const tax = subtotal * 0.18;
    const total = subtotal + tax;

    res.json({
      service,
      material: row.material,
      price_per_kg: parseFloat(row.price_per_kg),
      hasUnits: config.hasUnits,
      unitLabel: config.unitLabel,
      weightPerUnit: w,
      units: u,
      totalWeight,
      breakdown: {
        weightCost,
        installation,
        subtotal,
        tax,
        total
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ==================== QUOTES ====================

app.post('/api/quotes', async (req, res) => {
  try {
    const { customer_name, email, phone, category, description, weight, units, estimated_cost } = req.body;
    const result = await pool.query(
      `INSERT INTO quotes (customer_name, email, phone, category, description, weight, units, estimated_cost) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [customer_name, email, phone, category, description, weight, units, estimated_cost]
    );
    res.json({ id: result.rows[0].id, message: 'Quote submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/quotes', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM quotes ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== CONTACT ====================

// Get all contact messages (admin only)
app.get('/api/contacts', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM contacts ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a contact message (admin only)
app.delete('/api/contacts/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM contacts WHERE id = $1', [req.params.id]);
    res.json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    await pool.query(
      'INSERT INTO contacts (name, email, phone, message) VALUES ($1, $2, $3, $4)',
      [name, email, phone, message]
    );
    res.json({ message: 'Message sent successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== START ====================

initDb()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to init DB:', err);
    process.exit(1);
  });