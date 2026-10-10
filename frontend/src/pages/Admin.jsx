import React, { useState, useEffect } from 'react';
import api from '../api';
import './Admin.css';

const CATEGORIES = ['stairs', 'gates', 'doors', 'windows', 'fencing', 'shutters', 'sheds'];

const Admin = () => {
  const [loggedIn, setLoggedIn] = useState(!!sessionStorage.getItem('adminPwd'));
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState('photos');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/login', { password });
      sessionStorage.setItem('adminPwd', password);
      setLoggedIn(true);
    } catch {
      alert('Wrong password');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminPwd');
    setLoggedIn(false);
  };

  if (!loggedIn) {
    return (
      <div className="admin-login">
        <form onSubmit={handleLogin}>
          <h2>Admin Login</h2>
          <input
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>

      <div className="admin-tabs">
        <button className={tab === 'photos' ? 'active' : ''} onClick={() => setTab('photos')}>
          Manage Photos
        </button>
        <button className={tab === 'pricing' ? 'active' : ''} onClick={() => setTab('pricing')}>
          Pricing Editor
        </button>
        <button className={tab === 'inbox' ? 'active' : ''} onClick={() => setTab('inbox')}>
          📬 Inbox
        </button>
      </div>

      {tab === 'photos' && <PhotosManager />}
      {tab === 'pricing' && <PricingEditor />}
      {tab === 'inbox' && <Inbox />}
    </div>
  );
};

// ==================== PHOTOS MANAGER ====================
function PhotosManager() {
  const [photos, setPhotos] = useState([]);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({ title: '', category: 'stairs', description: '' });
  const [uploading, setUploading] = useState(false);

  // Bulk upload state
  const [bulkFiles, setBulkFiles] = useState([]);
  const [bulkCategory, setBulkCategory] = useState('doors');
  const [bulkTitlePrefix, setBulkTitlePrefix] = useState('');
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  useEffect(() => { loadPhotos(); }, []);

  const loadPhotos = async () => {
    try {
      const res = await api.get('/api/photos');
      setPhotos(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // ===== SINGLE UPLOAD =====
  const handleFile = (e) => {
    const f = e.target.files[0];
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert('Choose an image');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('title', form.title);
      fd.append('category', form.category);
      fd.append('description', form.description);

      await api.post('/api/photos', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('Photo uploaded!');
      setFile(null);
      setPreview(null);
      setForm({ title: '', category: 'stairs', description: '' });
      loadPhotos();
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  // ===== DELETE =====
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this photo?')) return;
    try {
      await api.delete(`/api/photos/${id}`);
      loadPhotos();
    } catch (err) {
      alert('Delete failed');
    }
  };

  // ===== BULK UPLOAD =====
  const handleBulkFiles = (e) => {
    const files = Array.from(e.target.files);
    setBulkFiles(files);
    setBulkResult(null);
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (bulkFiles.length === 0) return alert('Select files first');
    if (bulkFiles.length > 50) return alert('Max 50 files per batch. Split into multiple uploads.');

    setBulkUploading(true);
    setBulkResult(null);

    try {
      const fd = new FormData();
      bulkFiles.forEach((f) => fd.append('images', f));
      fd.append('category', bulkCategory);
      fd.append('titlePrefix', bulkTitlePrefix);

      const res = await api.post('/api/photos/bulk', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000
      });

      setBulkResult({
        success: true,
        uploaded: res.data.uploaded,
        failed: res.data.failed
      });

      setBulkFiles([]);
      loadPhotos();
    } catch (err) {
      setBulkResult({
        success: false,
        error: err.response?.data?.error || err.message
      });
    } finally {
      setBulkUploading(false);
    }
  };

  return (
    <div className="photos-manager">
      <div className="upload-forms-stack">
        {/* ===== SINGLE UPLOAD FORM ===== */}
        <div className="upload-form">
          <h2>📷 Upload Single Photo</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Image *</label>
              <input type="file" accept="image/*" onChange={handleFile} required />
              {preview && <img src={preview} alt="preview" className="preview" />}
            </div>

            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Custom Spiral Staircase"
                required
              />
            </div>

            <div className="form-group">
              <label>Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                rows="3"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief details about this work"
              />
            </div>

            <button type="submit" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload Photo'}
            </button>
          </form>
        </div>

        {/* ===== BULK UPLOAD FORM ===== */}
        <div className="upload-form bulk-form">
          <h2>⚡ Bulk Upload (Max 50)</h2>
          <form onSubmit={handleBulkUpload}>
            <div className="form-group">
              <label>Select Multiple Images *</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleBulkFiles}
              />
              {bulkFiles.length > 0 && (
                <p className="file-count">
                  ✅ {bulkFiles.length} file(s) selected
                </p>
              )}
            </div>

            <div className="form-group">
              <label>Category *</label>
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Title Prefix (optional)</label>
              <input
                type="text"
                value={bulkTitlePrefix}
                onChange={(e) => setBulkTitlePrefix(e.target.value)}
                placeholder="e.g. Designer Gate"
              />
              <small className="hint-text">
                Photos will be named: "Designer Gate 1", "Designer Gate 2"...
              </small>
            </div>

            <button type="submit" disabled={bulkUploading || bulkFiles.length === 0}>
              {bulkUploading
                ? `Uploading ${bulkFiles.length} files... Please wait`
                : `Upload All (${bulkFiles.length})`}
            </button>

            {bulkResult && bulkResult.success && (
              <div className="bulk-success">
                ✅ Uploaded: {bulkResult.uploaded} | ❌ Failed: {bulkResult.failed}
              </div>
            )}

            {bulkResult && !bulkResult.success && (
              <div className="bulk-error">
                ❌ Error: {bulkResult.error}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* ===== PHOTO LIST ===== */}
      <div className="photo-list">
        <h2>All Photos ({photos.length})</h2>
        <div className="admin-photo-grid">
          {photos.map((p) => (
            <div key={p.id} className="admin-photo-card">
              <img src={p.image_url} alt={p.title} />
              <div className="card-body">
                <h4>{p.title}</h4>
                <span className="cat-tag">{p.category}</span>
                <button className="delete-btn" onClick={() => handleDelete(p.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== PRICING EDITOR ====================
const SERVICES_LIST = [
  { value: 'stairs', label: 'Stairs' },
  { value: 'gates', label: 'Gates' },
  { value: 'doors', label: 'Doors' },
  { value: 'windows', label: 'Windows' },
  { value: 'fencing', label: 'Fencing' },
  { value: 'shutters', label: 'Shutters' },
  { value: 'sheds', label: 'Sheds' }
];

function PricingEditor() {
  const [pricing, setPricing] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ material: '', price_per_kg: '', services: [] });
  const [newForm, setNewForm] = useState({ material: '', price_per_kg: '', services: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadPricing(); }, []);

  const loadPricing = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/pricing');
      setPricing(res.data);
    } catch (err) {
      alert('Failed to load pricing');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (row) => {
    setEditing(row.id);
    setEditForm({
      material: row.material,
      price_per_kg: row.price_per_kg,
      services: row.services || []
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditForm({ material: '', price_per_kg: '', services: [] });
  };

  const saveEdit = async (id) => {
    if (editForm.services.length === 0) {
      return alert('Select at least one service');
    }
    setSaving(true);
    try {
      await api.put(`/api/pricing/${id}`, editForm);
      cancelEdit();
      await loadPricing();
    } catch (err) {
      alert('Update failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, material) => {
    if (!window.confirm(`Delete "${material}"?`)) return;
    try {
      await api.delete(`/api/pricing/${id}`);
      await loadPricing();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newForm.material || newForm.price_per_kg === '' || newForm.services.length === 0) {
      return alert('Fill all fields and pick at least one service');
    }
    setSaving(true);
    try {
      await api.post('/api/pricing', newForm);
      setNewForm({ material: '', price_per_kg: '', services: [] });
      await loadPricing();
    } catch (err) {
      alert('Add failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const toggleService = (form, setForm, service) => {
    const services = form.services.includes(service)
      ? form.services.filter((s) => s !== service)
      : [...form.services, service];
    setForm({ ...form, services });
  };

  if (loading) return <div className="loading">Loading pricing...</div>;

  return (
    <div className="pricing-editor">
      <div className="add-material-card">
        <h2>➕ Add New Material</h2>
        <form onSubmit={handleAdd}>
          <div className="add-form">
            <input
              type="text"
              placeholder="Material name (e.g. Copper Pipe)"
              value={newForm.material}
              onChange={(e) => setNewForm({ ...newForm, material: e.target.value })}
              required
            />
            <input
              type="number"
              placeholder="Price per kg (₹)"
              value={newForm.price_per_kg}
              onChange={(e) => setNewForm({ ...newForm, price_per_kg: e.target.value })}
              min="0"
              step="0.01"
              required
            />
          </div>
          <div className="services-picker">
            <label>Available for services:</label>
            <div className="services-chips">
              {SERVICES_LIST.map((s) => (
                <button
                  type="button"
                  key={s.value}
                  className={`chip ${newForm.services.includes(s.value) ? 'active' : ''}`}
                  onClick={() => toggleService(newForm, setNewForm, s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={saving}>
            {saving ? 'Adding...' : 'Add Material'}
          </button>
        </form>
      </div>

      <div className="pricing-table-card">
        <h2>💾 Current Materials</h2>
        <p className="hint">Changes reflect instantly in the calculator.</p>

        <table className="pricing-table">
          <thead>
            <tr>
              <th>Material</th>
              <th>Price / kg (₹)</th>
              <th>Services</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pricing.map((row) => (
              <tr key={row.id}>
                {editing === row.id ? (
                  <>
                    <td>
                      <input
                        type="text"
                        value={editForm.material}
                        onChange={(e) => setEditForm({ ...editForm, material: e.target.value })}
                        className="inline-input"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={editForm.price_per_kg}
                        onChange={(e) => setEditForm({ ...editForm, price_per_kg: e.target.value })}
                        min="0"
                        step="0.01"
                        className="inline-input"
                      />
                    </td>
                    <td>
                      <div className="services-chips small">
                        {SERVICES_LIST.map((s) => (
                          <button
                            type="button"
                            key={s.value}
                            className={`chip ${editForm.services.includes(s.value) ? 'active' : ''}`}
                            onClick={() => toggleService(editForm, setEditForm, s.value)}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="actions">
                      <button className="save-btn-sm" onClick={() => saveEdit(row.id)} disabled={saving}>✓</button>
                      <button className="cancel-btn-sm" onClick={cancelEdit}>✕</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td><b>{row.material}</b></td>
                    <td>₹{row.price_per_kg}</td>
                    <td>
                      <div className="services-chips small readonly">
                        {(row.services || []).map((s) => (
                          <span key={s} className="chip active">{s}</span>
                        ))}
                      </div>
                    </td>
                    <td className="actions">
                      <button className="edit-btn" onClick={() => startEdit(row)}>✏️</button>
                      <button className="delete-btn-sm" onClick={() => handleDelete(row.id, row.material)}>🗑️</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== INBOX (Quotes + Contacts) ====================
function Inbox() {
  const [view, setView] = useState('all');
  const [quotes, setQuotes] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [quotesRes, contactsRes] = await Promise.all([
        api.get('/api/quotes'),
        api.get('/api/contacts')
      ]);
      setQuotes(quotesRes.data);
      setContacts(contactsRes.data);
    } catch (err) {
      console.error(err);
      alert('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (id) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await api.delete(`/api/contacts/${id}`);
      loadAll();
    } catch (err) {
      alert('Delete failed');
    }
  };

  if (loading) return <div className="loading">Loading messages...</div>;

  const totalCount = quotes.length + contacts.length;

  return (
    <div className="inbox">
      <div className="inbox-header">
        <h2>📬 Inbox</h2>
        <p className="inbox-subtitle">
          {totalCount === 0
            ? 'No messages yet'
            : `${totalCount} message${totalCount > 1 ? 's' : ''} total`}
        </p>
      </div>

      <div className="inbox-filters">
        <button
          className={view === 'all' ? 'active' : ''}
          onClick={() => setView('all')}
        >
          All ({totalCount})
        </button>
        <button
          className={view === 'quotes' ? 'active' : ''}
          onClick={() => setView('quotes')}
        >
          📋 Quote Requests ({quotes.length})
        </button>
        <button
          className={view === 'contacts' ? 'active' : ''}
          onClick={() => setView('contacts')}
        >
          ✉️ Contact Messages ({contacts.length})
        </button>
      </div>

      {(view === 'all' || view === 'quotes') && quotes.length > 0 && (
        <div className="inbox-section">
          <h3 className="section-title">📋 Quote Requests</h3>
          <div className="message-list">
            {quotes.map((q) => (
              <div key={q.id} className="message-card quote-card">
                <div className="message-header">
                  <div>
                    <h4>{q.customer_name || 'Anonymous'}</h4>
                    <span className="message-date">
                      {new Date(q.created_at).toLocaleString()}
                    </span>
                  </div>
                  <span className="message-badge quote-badge">
                    ₹{parseFloat(q.estimated_cost || 0).toFixed(0)}
                  </span>
                </div>
                <div className="message-body">
                  <p><b>Category:</b> {q.category}</p>
                  <p><b>Details:</b> {q.description}</p>
                  <p><b>Weight:</b> {q.weight} kg | <b>Units:</b> {q.units}</p>
                </div>
                <div className="message-contact">
                  <a href={`mailto:${q.email}`}>✉️ {q.email}</a>
                  {q.phone && <a href={`tel:${q.phone}`}>📞 {q.phone}</a>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(view === 'all' || view === 'contacts') && contacts.length > 0 && (
        <div className="inbox-section">
          <h3 className="section-title">✉️ Contact Messages</h3>
          <div className="message-list">
            {contacts.map((c) => (
              <div key={c.id} className="message-card contact-card">
                <div className="message-header">
                  <div>
                    <h4>{c.name || 'Anonymous'}</h4>
                    <span className="message-date">
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <button
                    className="delete-msg-btn"
                    onClick={() => handleDeleteContact(c.id)}
                    title="Delete message"
                  >
                    🗑️
                  </button>
                </div>
                <div className="message-body">
                  <p>{c.message}</p>
                </div>
                <div className="message-contact">
                  <a href={`mailto:${c.email}`}>✉️ {c.email}</a>
                  {c.phone && <a href={`tel:${c.phone}`}>📞 {c.phone}</a>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalCount === 0 && (
        <div className="empty">
          <p style={{ fontSize: '3rem', margin: 0 }}>📭</p>
          <p>No messages yet.</p>
          <p className="hint">
            When customers submit the contact form or calculator, their messages will appear here.
          </p>
        </div>
      )}
    </div>
  );
}

export default Admin;