'use client';

import Navbar from '@/components/Navbar';

export default function AboutPage() {
  return (
    <>
      <div className="hero_area sub_page">
        <div className="brand_box">
          <a className="navbar-brand" href="/">
            <span>Parfum-Parfait</span>
          </a>
        </div>
      </div>

      <Navbar />

      {/* About section */}
      <section className="about_section layout_padding">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-6 px-0">
              <div className="img-box">
                <img src="/about-img.jpg" alt="About Parfum-Parfait" style={{ width: '100%' }} />
              </div>
            </div>
            <div className="col-md-5">
              <div className="detail-box">
                <div className="heading_container">
                  <hr />
                  <h2>About Parfum-Parfait</h2>
                </div>
                <p>
                  At Parfum-Parfait, we believe that a great fragrance is more than just a scent —
                  it&apos;s an expression of who you are. Founded with a passion for the art of perfumery,
                  we curate the finest fragrances from the world&apos;s most prestigious houses.
                </p>
                <p className="mt-3">
                  From the sun-drenched citrus of the Mediterranean to the warm amber of the Orient,
                  our collection tells stories through scent. Each bottle in our store is carefully
                  selected for its quality, uniqueness, and lasting impression.
                </p>
                <p className="mt-3">
                  We ship worldwide and guarantee 100% authentic products. Your perfect fragrance
                  is just a few clicks away.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="layout_padding2" style={{ background: '#f9f9f9' }}>
        <div className="container">
          <div className="heading_container text-center mb-5">
            <hr />
            <h2>Our Values</h2>
          </div>
          <div className="row text-center">
            {[
              { icon: '✨', title: 'Authenticity', desc: 'Every fragrance we sell is 100% genuine, sourced directly from authorised distributors.' },
              { icon: '🌿', title: 'Quality', desc: 'We only stock perfumes that meet our high standards of quality and longevity.' },
              { icon: '💨', title: 'Experience', desc: 'We guide you to the perfect scent for every occasion and personality.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="col-md-4 mb-4">
                <div style={{ padding: 30, background: '#fff', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: 40 }}>{icon}</div>
                  <h5 className="mt-3">{title}</h5>
                  <p style={{ color: '#666', marginTop: 8 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
