import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="logo">
          <img src="/logo.png" alt="LGW Works" className="logo-img" />
          <div className="logo-text">
            <span className="logo-name">LGW <b>Works</b></span>
            <span className="logo-tagline">Custom Fabrication & Fencing Works</span>
          </div>
        </Link>
        <ul className="nav-menu">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/gallery">Gallery</Link></li>
          <li><Link to="/calculator" className="cta-btn">Cost Calculator</Link></li>
          <li><Link to="/contact">Contact</Link></li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;