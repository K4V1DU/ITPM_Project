import React from "react";
import "../Boardings/Boardings.css";
import { FaAirbnb, FaBars, FaUser, FaSearch, FaFacebookF, FaTwitter, FaInstagram } from "react-icons/fa";

const Boarding = () => {
  return (
    <div>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-left">
          <a href="#" className="logo">
            <FaAirbnb /> Bodima
          </a>
          <div className="nav-menu">
            <a href="#" className="nav-item active">Stays</a>
            <a href="#" className="nav-item">Experiences</a>
            <a href="#" className="nav-item">Online Experiences</a>
          </div>
        </div>
        <div className="navbar-right">
          <button className="host-btn">Become a Host</button>
          <div className="profile-icon">
            <FaBars />
          </div>
          <div className="profile-icon">
            <FaUser />
          </div>
        </div>
      </nav>

      {/* Search Bar */}
      <div className="search-container">
        <div className="search-bar">
          <div className="search-field">
            <div className="search-item">
              <div className="search-label">Where</div>
              <input type="text" className="search-input" placeholder="Search destinations" />
            </div>
            <div className="search-item">
              <div className="search-label">When</div>
              <input type="text" className="search-input" placeholder="Add dates" />
            </div>
            <div className="search-item">
              <div className="search-label">Guests</div>
              <input type="text" className="search-input" placeholder="Add guests" />
            </div>
          </div>
          <button className="search-btn">
            <FaSearch />
          </button>
        </div>
      </div>

      {/* Sections */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Available in Kaduwela </h2>
          <a href="#" className="view-all">Show all</a>
        </div>
        <div className="card-container">
          {/* Example Card */}
          <div className="card">
            <div className="card-image-wrapper">
              <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop" alt="Room" className="card-image" />
              <div className="card-heart">♡</div>
            </div>
            <div className="card-content">
              <h3 className="card-title">Bodime Room in Malabe</h3>
              <p className="card-subtitle">Sooriya Mawatha • 1 room</p>
              <div className="card-footer">
                <span className="card-rating">★ 4.7</span>
                <span className="card-price">8500<span className="card-price-label">/month</span></span>
              </div>
            </div>
          </div>
          {/* You can copy other cards here similarly */}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-top">
          <div className="footer-column">
            <h4>Support</h4>
            <a href="#">Help Center</a>
            <a href="#">Safety</a>
            <a href="#">Cancellation Options</a>
            <a href="#">Community Guideline</a>
          </div>
          <div className="footer-column">
            <h4>Community</h4>
            <a href="#">Airbnb Adventure</a>
            <a href="#">New Features</a>
            <a href="#">Tips for Hosts</a>
            <a href="#">Careers</a>
          </div>
          <div className="footer-column">
            <h4>Host</h4>
            <a href="#">Host a home</a>
            <a href="#">Host an experience</a>
            <a href="#">Responsible hosting</a>
            <a href="#">Community forum</a>
          </div>
          <div className="footer-column">
            <h4>About</h4>
            <a href="#">About Airbnb</a>
            <a href="#">Newsroom</a>
            <a href="#">Investors</a>
            <a href="#">Airbnb Plus</a>
          </div>
        </div>

        <div className="footer-bottom">
          <div>
            <span>© 2026 Airbnb, Inc. · </span>
            <a href="#" style={{ color: "var(--text-secondary)", textDecoration: "none", cursor: "pointer" }}>Privacy · Terms · Sitemap</a>
          </div>
          <div className="footer-social">
            <a href="#" title="Facebook"><FaFacebookF /></a>
            <a href="#" title="Twitter"><FaTwitter /></a>
            <a href="#" title="Instagram"><FaInstagram /></a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Boarding;
