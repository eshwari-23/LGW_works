import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import './Gallery.css';

const CATEGORIES = ['all', 'stairs', 'gates', 'doors', 'windows', 'fencing', 'shutters', 'sheds'];
const Gallery = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';

  const [photos, setPhotos] = useState([]);
  const [category, setCategory] = useState(initialCategory);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/photos?category=${category}`);
      setPhotos(res.data);
    } catch (err) {
      console.error(err);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };
  fetchPhotos();
}, [category]);

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    setSearchParams(cat === 'all' ? {} : { category: cat });
  };

  return (
    <div className="gallery-page">
      <div className="page-header">
        <h1>Our Work Gallery</h1>
        <p>Browse our completed fabrication projects</p>
      </div>

      <div className="filter-bar">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={category === c ? 'active' : ''}
            onClick={() => handleCategoryChange(c)}
          >
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">Loading photos...</div>
      ) : photos.length === 0 ? (
        <div className="empty">
          <p>No photos yet in this category.</p>
          <p className="hint">Check back soon!</p>
        </div>
      ) : (
        <div className="photo-grid">
          {photos.map((p) => (
            <div
              key={p.id}
              className="photo-card"
              onClick={() => setSelected(p)}
            >
              <img src={p.image_url} alt={p.title} loading="lazy" />
              <div className="photo-overlay">
                <h3>{p.title}</h3>
                <span>{p.category}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="lightbox" onClick={() => setSelected(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelected(null)}>×</button>
            <img src={selected.image_url} alt={selected.title} />
            <div className="lightbox-info">
              <h2>{selected.title}</h2>
              <p className="cat">{selected.category}</p>
              {selected.description && <p>{selected.description}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;