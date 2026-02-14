import React, { useState } from 'react';
import '../NavBar/NavBar.css';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  const closeMenus = () => {
    setIsMenuOpen(false);
    setIsProfileOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Left Section - Logo */}
        <div className="navbar-left">
          <a href="#home" className="navbar-logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#ff385c"/>
              <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="#ff385c"/>
            </svg>
            <span className="logo-text">airbnb</span>
          </a>
        </div>

        {/* Center Section - Navigation */}
        <div className="navbar-center">
          <a href="#homes" className="nav-link active">
            <span className="nav-icon">🏠</span>
            Stays
          </a>
          <a href="#experiences" className="nav-link">
            <span className="nav-icon">🎈</span>
            Experiences
            <span className="nav-badge">NEW</span>
          </a>
          <a href="#services" className="nav-link">
            <span className="nav-icon">🔧</span>
            Services
            <span className="nav-badge">NEW</span>
          </a>
        </div>

        {/* Right Section - Actions */}
        <div className="navbar-right">
          <button className="nav-btn host-btn" onClick={closeMenus}>
            <span className="host-icon">🏠</span>
            Become a Host
          </button>

          <button className="nav-btn icon-btn" onClick={closeMenus}>
            <i className="fas fa-globe"></i>
          </button>

          {/* Profile Dropdown */}
          <div className="profile-dropdown">
            <button 
              className="profile-btn"
              onClick={toggleProfile}
            >
              <i className="fas fa-bars"></i>
              <i className="fas fa-user-circle"></i>
            </button>

            {isProfileOpen && (
              <div className="profile-menu">
                <a href="#login" className="profile-link">Sign up</a>
                <a href="#login" className="profile-link">Log in</a>
                <div className="profile-divider"></div>
                <a href="#host" className="profile-link">Airbnb your home</a>
                <a href="#host-experience" className="profile-link">Host an experience</a>
                <a href="#host-service" className="profile-link">Host a service</a>
                <div className="profile-divider"></div>
                <a href="#help" className="profile-link">Help Center</a>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className={`navbar-toggle ${isMenuOpen ? 'active' : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="mobile-menu">
          <div className="mobile-menu-content">
            <a href="#homes" className="mobile-link" onClick={closeMenus}>
              <span className="mobile-icon">🏠</span>
              Stays
            </a>
            <a href="#experiences" className="mobile-link" onClick={closeMenus}>
              <span className="mobile-icon">🎈</span>
              Experiences
              <span className="nav-badge">NEW</span>
            </a>
            <a href="#services" className="mobile-link" onClick={closeMenus}>
              <span className="mobile-icon">🔧</span>
              Services
              <span className="nav-badge">NEW</span>
            </a>
            <div className="mobile-divider"></div>
            <a href="#host" className="mobile-link" onClick={closeMenus}>
              <span className="mobile-icon">🏠</span>
              Become a Host
            </a>
            <a href="#help" className="mobile-link" onClick={closeMenus}>
              <span className="mobile-icon">❓</span>
              Help Center
            </a>
            <div className="mobile-divider"></div>
            <a href="#login" className="mobile-link login-link" onClick={closeMenus}>
              Sign up
            </a>
            <a href="#login" className="mobile-link login-link" onClick={closeMenus}>
              Log in
            </a>
          </div>
        </div>
      )}

      {/* Overlay for dropdowns */}
      {(isMenuOpen || isProfileOpen) && (
        <div className="navbar-overlay" onClick={closeMenus}></div>
      )}
    </nav>
  );
};

export default Navbar;
