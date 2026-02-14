import React, { useEffect, useState } from "react";
import "./Boardings.css";
import {
  FaAirbnb,
  FaBars,
  FaUser,
  FaSearch,
  FaFacebookF,
  FaTwitter,
  FaInstagram,
} from "react-icons/fa";
import axios from "axios";

const Boarding = () => {
  const [accommodations, setAccommodations] = useState([]);
  const [imageUrls, setImageUrls] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccommodations = async () => {
      try {
        setLoading(true);
        const res = await axios.get("http://localhost:5000/accommodation");

        if (res.data.success) {
          // Only include available accommodations
          const accData = res.data.data.filter((acc) => acc.isAvailable);
          setAccommodations(accData);

          const urls = {};

          await Promise.all(
            accData.map(async (acc) => {
              if (acc.images && acc.images.length > 0) {
                const imageId = acc.images[0];
                try {
                  const imageRes = await axios.get(
                    `http://localhost:5000/Photo/${imageId}`,
                    { responseType: "blob" }
                  );
                  const imageUrl = URL.createObjectURL(imageRes.data);
                  urls[acc._id] = imageUrl;
                } catch (err) {
                  console.error("Failed to fetch image:", err);
                  urls[acc._id] = "https://via.placeholder.com/400x300";
                }
              } else {
                urls[acc._id] = "https://via.placeholder.com/400x300";
              }
            })
          );

          setImageUrls(urls);
        }
      } catch (err) {
        console.error("Failed to fetch accommodations:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAccommodations();
  }, []);

  return (
    <div>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-left">
          <a href="#" className="logo">
            <FaAirbnb /> Bodima
          </a>
          <div className="nav-menu">
            <a href="#" className="nav-item active">
              Boardings
            </a>
            <a href="#" className="nav-item">
              Food Services
            </a>
            <a href="#" className="nav-item">
              Online Experiences
            </a>
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
          <input
            type="text"
            className="search-input"
            placeholder="Search for hostels, rooms, or apartments"
          />
          <button className="search-btn">
            <FaSearch />
          </button>
        </div>
      </div>

      {/* Listings Section */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Nearest on your Campus</h2>
          <a href="#" className="view-all">
            Show all
          </a>
        </div>

        <div className="card-container">
          {loading ? (
            <div className="card-loading">
              <div className="spinner"></div>
            </div>
          ) : accommodations.length === 0 ? (
            <p style={{ textAlign: "center", width: "100%", color: "#717171" }}>
              No accommodations found.
            </p>
          ) : (
            accommodations.map((acc) => (
              <div key={acc._id} className="card">
                <div className="card-image-wrapper">
                  <img
                    src={
                      imageUrls[acc._id] || "https://via.placeholder.com/400x300"
                    }
                    alt={acc.title}
                    className="card-image"
                  />
                  <div className="card-heart">♡</div>
                </div>

                <div className="card-content">
                  <h3 className="card-title">{acc.title}</h3>
                  <p className="card-subtitle">
                    {acc.address} • {acc.bedrooms} bed(s)
                  </p>

                  <div className="card-footer">
                    <span className="card-rating">
                      ★ {acc.ratingAverage ? acc.ratingAverage.toFixed(1) : "0.0"}
                    </span>

                    <span className="card-price">
                      Rs {acc.pricePerMonth}
                      <span className="card-price-label">/month</span>
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
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
            <a
              href="#"
              style={{
                color: "var(--text-secondary)",
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              Privacy · Terms · Sitemap
            </a>
          </div>

          <div className="footer-social">
            <a href="#" title="Facebook">
              <FaFacebookF />
            </a>
            <a href="#" title="Twitter">
              <FaTwitter />
            </a>
            <a href="#" title="Instagram">
              <FaInstagram />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Boarding;
