import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const HERO_IMAGES = [
  '/hero1.jpg',
  '/hero2.jpg',
  '/hero4.jpg'
];

const Home = () => {
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const categories = [
    { name: 'stairs', title: 'Staircases', icon: '🪜', desc: 'Custom steel & iron staircases' },
    { name: 'gates', title: 'Gates', icon: '🚪', desc: 'Designer main gates & security gates' },
    { name: 'doors', title: 'Doors', icon: '🚪', desc: 'Metal doors & safety doors' },
    { name: 'windows', title: 'Windows', icon: '🪟', desc: 'Steel & iron windows' },
    { name: 'fencing', title: 'Fencing Mesh', icon: '🔲', desc: 'Chain link & wire mesh fencing' },
    { name: 'sheds', title: 'Sheds', icon: '🏠', desc: 'Industrial & residential sheds' }
  ];

  return (
    <div className="home">
      <section className="hero">
        {HERO_IMAGES.map((img, idx) => (
          <div
            key={idx}
            className={`hero-bg ${idx === currentImage ? 'active' : ''}`}
            style={{ backgroundImage: `url(${img})` }}
          />
        ))}
        <div className="hero-overlay" />
        <div className="hero-content">
          <h1 className="hero-brand">Lakshmi Grills & Welding Works</h1>
          <h2>Premium Fabrication & Welding Works</h2>
          <p>Custom stairs, gates, doors, windows, fencing, sheds & shields — crafted with precision</p>
          <div className="hero-buttons">
            <Link to="/calculator" className="btn btn-primary">Calculate Cost</Link>
            <Link to="/gallery" className="btn btn-secondary">View Our Work</Link>
          </div>
        </div>
      </section>

      <section className="categories">
        <h2>Our Services</h2>
        <div className="category-grid">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              to={`/gallery?category=${cat.name}`}
              className="category-card"
            >
              <div className="category-icon">{cat.icon}</div>
              <h3>{cat.title}</h3>
              <p>{cat.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="why-us">
        <h2>Why Choose Us</h2>
        <div className="features">
          <div className="feature">
            <div className="feature-icon">✓</div>
            <h3>Quality Materials</h3>
            <p>Premium grade steel & iron</p>
          </div>
          <div className="feature">
            <div className="feature-icon">⏱️</div>
            <h3>On-Time Delivery</h3>
            <p>We complete work on schedule</p>
          </div>
          <div className="feature">
            <div className="feature-icon">💰</div>
            <h3>Best Pricing</h3>
            <p>Transparent rates with instant calculator</p>
          </div>
          <div className="feature">
            <div className="feature-icon">🛠️</div>
            <h3>Precision Work</h3>
            <p>Skilled craftsmanship in every weld</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;