import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-col">
          <div className="footer-brand">
            <img src="/logo.png" alt="LGW Works" className="footer-logo" />
            <div>
              <h3>LGW <b>Works</b></h3>
              <p className="tagline">Custom Fabrication & Fencing Works</p>
            </div>
          </div>
          <p>Premium fabrication & welding services for stairs, gates, doors, windows & fencing mesh.</p>
        </div>
        <div className="footer-col">
          <h4>Quick Links</h4>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/gallery">Gallery</Link></li>
            <li><Link to="/calculator">Cost Calculator</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>
       <div className="footer-col">
  <h4>Services</h4>
  <ul>
    <li>Custom Stairs</li>
    <li>Designer Gates</li>
    <li>Metal Doors</li>
    <li>Steel Windows</li>
    <li>Fencing Mesh</li>
    <li>Shutters</li>
    <li>Sheds</li>
  </ul>
</div>
        <div className="footer-col">
          <h4>Contact</h4>
          <p>📞 +91 9164163152</p>
          <p>✉️ lgwworks57@gmail.com</p>
          <p>📍 Behind John Deere showroom, Gangavathi Road, Sindhanur-584128</p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2026 LGW Works. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;