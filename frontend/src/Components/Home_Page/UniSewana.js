import { useState, useEffect, useRef } from 'react';
import './unisewana.css';

/* ─── Data ──────────────────────────────────────────────────────────── */
const MARQUEE_ITEMS = [
  'Safe Accommodation', 'Nutritious Meals', 'Verified Hosts',
  'Student Community', 'Easy Booking', '24/7 Support',
  'Affordable Rates', 'Campus Life Made Easy',
];



const SERVICE_CARDS_LEFT = [
  {
    title: 'Boarding Houses',
    desc: 'Browse verified rooms and boarding houses near SLIIT, listed directly by boarding owners — inspected, reviewed, and ready to move in.',
    icon: '/images/icon2.png',
    alt: 'Boarding room icon',
  },
];

const SERVICE_CARDS_MID = [
  {
    title: 'Food Services',
    desc: 'Find home-cooked meal providers and food service owners near campus. Daily plans, flexible subscriptions, Sri Lankan favourites.',
    icon: '/images/icon5.png',
    alt: 'Food service icon',
  },
  {
    title: 'Malabe Area Coverage',
    desc: 'All listings are within walking or short transit distance from SLIIT\'s Malabe campus — no long commutes, no guesswork.',
    icon: '/images/icon10.png',
    alt: 'Malabe area map icon',
  },
];

const FOOD_FEATURES = [
  { icon: '🌅', title: 'Breakfast, Lunch & Dinner',    desc: 'Full daily meal packages from local providers. Hoppers, rice & curry, string hoppers — real home food.' },
  { icon: '📋', title: 'Flexible Meal Subscriptions',  desc: 'Weekly or monthly plans offered directly by food service owners. Pause during holidays, no waste.' },
  { icon: '📍', title: 'All Near SLIIT Malabe',        desc: 'Every listed food provider is within walking distance or a short ride from the SLIIT campus gate.' },
  { icon: '⭐', title: 'Student-Reviewed Providers',   desc: 'Real ratings from SLIIT students help you pick the best food service. Quality stays consistent.' },
];

const ROOM_CARDS = [
  {
    img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
    alt: 'Family boarding house near SLIIT',
    type: 'Family Boarding House', price: 'From LKR 12,000 / month',
    tags: ['Meals Included', 'WiFi', 'Near SLIIT Gate'],
    large: true, delay: '',
  },
  {
    img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80',
    alt: 'Single room boarding near SLIIT',
    type: 'Single Room', price: 'From LKR 8,000 / month',
    tags: ['Private', 'AC'],
    large: false, delay: 'reveal-delay-1',
  },
  {
    img: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600&q=80',
    alt: 'Shared boarding room near SLIIT',
    type: 'Shared Boarding', price: 'From LKR 5,500 / month',
    tags: ['Affordable', 'Study Area'],
    large: false, delay: 'reveal-delay-2',
  },
];

const ACCOM_POINTS = [
  { num: '01', title: 'Filter Near SLIIT Malabe',          desc: 'Filter by distance from SLIIT gate, budget, meal inclusion, and room type. Find your ideal stay in minutes.',                          delay: '' },
  { num: '02', title: 'Verified Boarding Owners',          desc: 'All boarding owners go through identity verification and property inspection before their listing goes live.',                          delay: 'reveal-delay-1' },
  { num: '03', title: 'Book Online, Move In Smoothly',     desc: 'Connect with the boarding owner directly, confirm details, and move in stress-free. We support you every step.',                        delay: 'reveal-delay-2' },
  { num: '04', title: 'Transparent Pricing, No Hidden Fees', desc: 'Monthly rates include exactly what the boarding owner lists. No surprises, just clarity.',                                           delay: 'reveal-delay-3' },
];

const STUDENT_STEPS = [
  { n: '1', title: 'Create Your Student Profile',  desc: 'Sign up with your SLIIT student ID, set your budget, and specify whether you need boarding, food, or both.' },
  { n: '2', title: 'Browse Nearby Listings',       desc: 'View boarding houses and food services around SLIIT Malabe. Filter by distance, price, and what\'s included.' },
  { n: '3', title: 'Connect with the Owner',       desc: 'Message boarding owners or food service providers directly through UniSewana. All communication is safe and on-platform.' },
  { n: '4', title: 'Move In & Subscribe',          desc: "Confirm your boarding, subscribe to a meal plan, and settle in. We're here 24/7 if anything comes up." },
];

const STUDENT_BENEFITS = [
  'Listings within minutes of SLIIT campus gate',
  'Home-cooked meals from verified food providers',
  'All boarding owners are verified and inspected',
  'Semester-long and monthly options available',
  'Transparent pricing — no hidden costs',
  '24/7 student support line',
  'No agency fees — connect directly with owners',
];

const OWNER_STEPS = [
  { n: '1', title: 'Register as a Service Owner',  desc: 'Sign up as a boarding owner or food service provider. Submit your NIC and property or kitchen details for verification.' },
  { n: '2', title: 'Create Your Listing',          desc: 'Add photos, set your monthly rate or meal plan price, list what\'s included, and publish to SLIIT students.' },
  { n: '3', title: 'Receive Student Enquiries',    desc: 'SLIIT students contact you directly through the platform. Review their profile and confirm when ready.' },
  { n: '4', title: 'Earn Consistently & Grow',     desc: 'Build your rating with student reviews, keep occupancy high, and grow your listing visibility on UniSewana.' },
];

const OWNER_BENEFITS = [
  "Direct access to SLIIT's student population",
  'Free to list — no upfront costs',
  'Verified students only — safe and reliable tenants',
  'UniSewana handles enquiries and messaging',
  'Grow your reputation with student reviews',
  'Support from the UniSewana team when needed',
  'Dedicated boarding owner & food provider portal',
];

const TESTIMONIALS = [
  { initials: 'KP', name: 'Kavindi Perera',   role: 'IT Student, SLIIT',         text: '"Found my boarding in Malabe within a day of arriving at SLIIT. The owner was super welcoming and the room was exactly as listed."' },
  { initials: 'RS', name: 'Ravindu Silva',    role: 'SE Student, SLIIT',         text: '"The meal subscription from the food provider near SLIIT gate saved me during exam season. Rice and curry every day — just like home."' },
  { initials: 'NF', name: 'Nirmala Fernando', role: 'Boarding Owner, Malabe',    text: '"I listed my 3 rooms on UniSewana and had them filled within 2 weeks. The student profiles made it easy to choose the right tenants."' },
  { initials: 'PK', name: 'Piriya Karan',     role: 'CS Student, SLIIT',         text: '"Coming from Jaffna, I had no contacts in Malabe. UniSewana connected me to a boarding and a meal plan close to campus in one go."' },
  { initials: 'TW', name: 'Tharushi Wickrama',role: 'DS Student, SLIIT',         text: '"My parents were relieved knowing the boarding was verified. The transparency on pricing meant no surprises at the end of the month."' },
  { initials: 'DM', name: 'Dilrukshi Mendis', role: 'Food Service Owner, Malabe',text: '"Running my food service near SLIIT got so much easier after listing here. I now have 18 regular student subscribers every semester."' },
];

/* ─── Helpers ───────────────────────────────────────────────────────── */
function useScrollReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.15 }
    );
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

function useNavScroll() {
  useEffect(() => {
    const nav = document.getElementById('navbar');
    const handler = () => nav?.classList.toggle('scrolled', window.scrollY > 50);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);
}

function useCounterAnimation(ref) {
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        ref.current.querySelectorAll('.stat-num').forEach(el => {
          const text = el.textContent;
          const num = parseFloat(text);
          if (isNaN(num)) return;
          let start = 0;
          const dur = 2000, step = 16;
          const inc = num / (dur / step);
          const timer = setInterval(() => {
            start += inc;
            if (start >= num) { start = num; clearInterval(timer); }
            el.innerHTML = (num < 100 ? start.toFixed(1) : Math.floor(start)) + text.replace(/[\d.]/g, '');
          }, step);
        });
        obs.disconnect();
      },
      { threshold: 0.5 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
}

/* ─── Sub-components ────────────────────────────────────────────────── */
function TestimCard({ initials, name, role, text }) {
  return (
    <div className="testim-card">
      <div className="stars">★★★★★</div>
      <p className="testim-text">{text}</p>
      <div className="testim-author">
        <div className="avatar">{initials}</div>
        <div>
          <div className="author-name">{name}</div>
          <div className="author-role">{role}</div>
        </div>
      </div>
    </div>
  );
}

function TabPanel({ steps, benefits, cardTitle }) {
  return (
    <>
      <div className="student-steps">
        {steps.map(s => (
          <div className="step" key={s.n}>
            <div className="step-num">{s.n}</div>
            <div className="step-content">
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="student-visual">
        <div className="student-card-title">{cardTitle}</div>
        <div className="benefit-list">
          {benefits.map(b => (
            <div className="benefit-item" key={b}>
              <div className="benefit-check">✓</div> {b}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ─── Main Component ────────────────────────────────────────────────── */
export default function UniSewana() {
  const [activeTab, setActiveTab] = useState('visiting');
  const statsRef = useRef(null);

  useNavScroll();
  useScrollReveal();
  useCounterAnimation(statsRef);

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-grid" />

        <div className="float-badge b2">
          <span className="badge-icon">🏠</span>
          <div>
            <div className="badge-title">Verified Boardings</div>
            <div className="badge-sub">Near SLIIT</div>
          </div>
        </div>

        <div className="hero-tag">SLIIT Campus · Malabe</div>

        <h1>
          Find Your Stay,<br />
          <em>Near</em> <span className="outline">SLIIT</span>
        </h1>

        <p className="hero-sub">
          UniSewana connects SLIIT students with trusted boarding houses, home-cooked meals,
          and verified food services — right around your campus.
        </p>

        <div className="hero-btns">
          <a href="#accommodation" className="btn-primary">Find Boarding ↗</a>
          <a href="#food" className="btn-ghost">Find Foods →</a>
        </div>

        <div className="hero-stats" ref={statsRef}>
          <div className="stat">
            <div className="stat-num">320<span>+</span></div>
            <div className="stat-label">SLIIT Students</div>
          </div>
          {[
            { num: '85+', label: 'Boarding Owners' },
            { num: '40+', label: 'Food Services' },
            { num: '98%', label: 'Satisfaction' },
          ].map(s => (
            <div className="stat" key={s.label} style={{ borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: 48 }}>
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section className="services" id="services">
        <div className="services-header">
          <div>
            <div className="section-label">What We Offer</div>
            <h2 className="section-title">Everything SLIIT<br />students need</h2>
          </div>
        </div>

        <div className="services-asymmetric">

          {/* LEFT 50% — two card columns in a nested grid */}
          <div className="svc-cards-area">

            {/* Col 1 — 1 card, offset down */}
            <div className="svc-col svc-col-left">
              {SERVICE_CARDS_LEFT.map(card => (
                <div className="svc-plain-card" key={card.title}>
                  <div className="svc-icon-wrap">
                    <img src={card.icon} alt={card.alt} className="svc-icon-img" />
                  </div>
                  <h3 className="svc-card-title">{card.title}</h3>
                  <p className="svc-card-desc">{card.desc}</p>
                </div>
              ))}
            </div>

            {/* Col 2 — 2 stacked cards */}
            <div className="svc-col svc-col-mid">
              {SERVICE_CARDS_MID.map(card => (
                <div className="svc-plain-card" key={card.title}>
                  <div className="svc-icon-wrap">
                    <img src={card.icon} alt={card.alt} className="svc-icon-img" />
                  </div>
                  <h3 className="svc-card-title">{card.title}</h3>
                  <p className="svc-card-desc">{card.desc}</p>
                </div>
              ))}
            </div>

          </div>

          {/* RIGHT 50% — steps */}
          <div className="svc-col-steps">
            {STUDENT_STEPS.map((s, i) => (
              <div className="svc-step" key={s.n}>
                <div className="svc-step-inner">
                  <h4 className="svc-step-title">{s.title}</h4>
                  <p className="svc-step-desc">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* FOOD */}
      <div className="food-section" id="food">
        <div className="food-visual">
          <div className="food-main-card reveal">
            <img
              src="https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80"
              alt="Home-cooked Sri Lankan meals near SLIIT"
            />
            <div className="food-img-overlay" />
            <div className="food-caption">Home-cooked Sri Lankan meals</div>
            <div className="food-badge">🍳 Daily Meal Plans</div>
          </div>
        </div>

        <div>
          <div className="section-label">Food Services</div>
          <h2 className="section-title reveal">Eat well,<br />near campus</h2>
          <p className="section-desc reveal reveal-delay-1" style={{ marginBottom: 0 }}>
            Verified food service owners near SLIIT Malabe offer affordable, home-cooked Sri Lankan meals — so you never
            go hungry during a busy semester.
          </p>
          <div className="food-features reveal reveal-delay-2">
            {FOOD_FEATURES.map(f => (
              <div className="food-feature" key={f.title}>
                <span className="feat-icon">{f.icon}</span>
                <div className="feat-text">
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ACCOMMODATION */}
      <section className="accommodation" id="accommodation">
        <div className="section-label">Accommodation</div>
        <h2 className="section-title reveal">Boardings near<br />SLIIT Malabe</h2>

        <div className="accom-grid">
          <div className="room-cards">
            {ROOM_CARDS.map(r => (
              <div className={`room-card ${r.large ? 'large' : ''} reveal ${r.delay}`} key={r.type}>
                <img src={r.img} alt={r.alt} />
                <div className="room-card-overlay" />
                <div className="room-card-info">
                  <div className="room-type">{r.type}</div>
                  <div className="room-price">{r.price}</div>
                  <div className="room-tag-row">
                    {r.tags.map(t => <span className="room-tag" key={t}>{t}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="accom-info">
            <p className="section-desc reveal" style={{ marginBottom: 20 }}>
              Every boarding listing near SLIIT is inspected, verified by us, and reviewed by current students.
              Real photos, real prices, real peace of mind.
            </p>
            {ACCOM_POINTS.map(p => (
              <div className={`accom-point reveal ${p.delay}`} key={p.num}>
                <div className="accom-num">{p.num}</div>
                <div className="accom-text">
                  <h3>{p.title}</h3>
                  <p>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="student-section" id="students">
        <div className="section-label">How It Works</div>
        <h2 className="section-title reveal">Are you a SLIIT student<br />or a service owner?</h2>
        <p className="section-desc reveal reveal-delay-1" style={{ marginBottom: 40 }}>
          UniSewana serves two groups — SLIIT students looking for a place to stay or eat, and
          boarding/food service owners wanting to reach them.
        </p>

        <div className="student-tabs reveal">
          <button
            className={`tab-btn ${activeTab === 'visiting' ? 'active' : ''}`}
            onClick={() => setActiveTab('visiting')}
          >
            🎓 SLIIT Student
          </button>
          <button
            className={`tab-btn ${activeTab === 'hosting' ? 'active' : ''}`}
            onClick={() => setActiveTab('hosting')}
          >
            🏡 Service Owner
          </button>
        </div>

        <div className={`tab-content ${activeTab === 'visiting' ? 'active' : ''}`} id="tab-visiting">
          <TabPanel steps={STUDENT_STEPS} benefits={STUDENT_BENEFITS} cardTitle="Why SLIIT students choose UniSewana" />
        </div>

        <div className={`tab-content ${activeTab === 'hosting' ? 'active' : ''}`} id="tab-hosting">
          <TabPanel steps={OWNER_STEPS} benefits={OWNER_BENEFITS} cardTitle="Why owners list on UniSewana" />
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials">
        <div className="testimonials-header">
          <div className="section-label">Stories</div>
          <h2 className="section-title reveal">Loved by SLIIT students<br />&amp; service owners</h2>
        </div>
        <div className="testimonials-track-wrap">
          <div className="testimonials-track">
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
              <TestimCard key={i} {...t} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-inner reveal">
          <div className="cta-glow" />
          <h2>Your SLIIT life,<br />sorted from day one</h2>
          <p>
            Whether you're a SLIIT student searching for a boarding or meal plan, or an owner looking
            to reach students — UniSewana is your platform.
          </p>
          <div className="cta-btns">
            <a href="#accommodation" className="btn-primary">Find a Boarding ↗</a>
            <a href="#students" className="btn-ghost">List Your Service →</a>
          </div>
        </div>
      </section>

    </>
  );
}