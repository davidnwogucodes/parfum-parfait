'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ProductCard from '@/components/ProductCard';

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedAccord, setSelectedAccord] = useState('');
  const [accordOptions, setAccordOptions] = useState([]);

  useEffect(() => {
    setFeaturedLoading(true);
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => {
        const products = Array.isArray(data.products) ? data.products : [];
        setAllProducts(products);
        setFeatured(products.slice(0, 6));

        const labels = new Set();
        for (const p of products) {
          const accords = Array.isArray(p?.accords) ? p.accords : [];
          for (const a of accords) {
            const label = String(a?.label || '').trim();
            if (label) labels.add(label);
          }
        }
        setAccordOptions(Array.from(labels).sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => {})
      .finally(() => setFeaturedLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/best-sellers')
      .then((r) => r.json())
      .then((data) => setBestSellers((data.products || []).slice(0, 6)))
      .catch(() => {});
  }, []);

  return (
    <>
      {/* Hero */}
      <div className="hero_area">
        <section className="slider_section position-relative">
          <div id="carouselHero" className="carousel slide" data-bs-ride="carousel">
            <div className="carousel-inner">
              {[0, 1, 2].map((i) => (
                <div key={i} className={i === 0 ? 'carousel-item active' : 'carousel-item'}>
                  <div className="img-box">
                    <img src="/hh.png" alt="Parfum-Parfait" />
                  </div>
                </div>
              ))}
            </div>
            <button className="carousel-control-prev" type="button" data-bs-target="#carouselHero" data-bs-slide="prev">
              <span className="sr-only">Previous</span>
            </button>
            <button className="carousel-control-next" type="button" data-bs-target="#carouselHero" data-bs-slide="next">
              <span className="sr-only">Next</span>
            </button>
          </div>
          <div className="hero_overlay">
            <div className="hero_overlay_nav">
              <Navbar />
            </div>
            <div className="hero_overlay_content">
              <h1 className="hero_glass_text">Parfum-Parfait</h1>
              <p className="hero_glass_subtext">
                Discover the finest fragrances, crafted to leave a lasting impression.
              </p>
              <Link href="/shop" className="hero_overlay_btn">
                Shop Now
              </Link>
            </div>
          </div>
        </section>
      </div>

      <section className="fruit_section layout_padding">
        <div className="container">
          <div className="heading_container heading_container_full_underline">
            <h2>Best Sellers</h2>
            <hr />
          </div>
        </div>
        <div className="container-fluid">
          <div className="fruit_container">
            {bestSellers.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                enableModal={false}
                showDetailsButton={false}
                showAccordsInline={true}
              />
            ))}
          </div>
          {bestSellers.length === 0 && (
            <p className="text-center py-2" style={{ color: '#888' }}>
              No best sellers yet. Set them in Admin → Products.
            </p>
          )}
        </div>
      </section>

      <section className="about_section" id="find-my-taste">
        <div className="container-fluid">
          <div className="row">
            <div className="col-12">
              <div
                className="detail-box"
                style={{
                  maxWidth: 1100,
                  margin: '0 auto',
                  padding: '26px 18px',
                }}
              >
                <div className="heading_container">
                  <hr />
                  <h2>Find my taste</h2>
                </div>

                <p style={{ marginBottom: 14, maxWidth: 820 }}>
                  Choose an accord you love (sweet, woody, musky…) and we’ll instantly recommend perfumes that match your vibe.
                </p>

                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <select
                    value={selectedAccord}
                    onChange={(e) => setSelectedAccord(e.target.value)}
                    style={{
                      minWidth: 260,
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid rgba(0,0,0,0.22)',
                      background: '#fff',
                    }}
                    aria-label="Choose an accord"
                  >
                    <option value="">Pick an accord…</option>
                    {(accordOptions.length ? accordOptions : ['sweet', 'woody', 'floral', 'fresh', 'musky', 'vanilla']).map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setSelectedAccord('')}
                    disabled={!selectedAccord}
                    className="pp_glass_btn"
                    aria-disabled={!selectedAccord}
                  >
                    Clear
                  </button>

                  <Link
                    href="/shop"
                    className="pp_glass_btn"
                  >
                    Browse all
                  </Link>
                </div>

                <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {(accordOptions.length ? accordOptions.slice(0, 10) : ['sweet', 'woody', 'floral', 'fresh', 'musky', 'vanilla', 'citrus', 'amber'])
                    .map((a) => {
                      const active = String(selectedAccord).toLowerCase().trim() === String(a).toLowerCase().trim();
                      return (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setSelectedAccord(a)}
                          className={`pp_glass_btn${active ? ' pp_glass_btn_dark' : ''}`}
                          aria-pressed={active}
                        >
                          {String(a).toLowerCase()}
                        </button>
                      );
                    })}
                </div>

                <div
                  style={{
                    marginTop: 18,
                    padding: 14,
                    borderRadius: 16,
                    background: 'linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.02))',
                    border: '1px solid rgba(0,0,0,0.10)',
                  }}
                >
                  {!selectedAccord ? (
                    <div style={{ color: '#666' }}>
                      Pick an accord to see recommendations.
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 900, letterSpacing: '0.04em' }}>
                          Recommendations for <span style={{ textTransform: 'lowercase' }}>{selectedAccord}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#555' }}>
                          Based on main accords you set in Admin
                        </div>
                      </div>

                      <div style={{ marginTop: 12 }}>
                        {(() => {
                          const needle = String(selectedAccord).toLowerCase().trim();
                          const scored = (Array.isArray(allProducts) ? allProducts : [])
                            .map((p) => {
                              const accords = Array.isArray(p?.accords) ? p.accords : [];
                              const hit = accords.find((a) => String(a?.label || '').toLowerCase().trim() === needle);
                              const score = hit ? Number(hit?.strength ?? 3) : 0;
                              return { p, score };
                            })
                            .filter(({ score }) => score > 0)
                            .sort((a, b) => b.score - a.score);

                          const picks = scored.slice(0, 6).map(({ p }) => p);

                          if (picks.length === 0) {
                            return (
                              <div style={{ color: '#666' }}>
                                No matches yet for this accord. Try another one, or add accords to products in Admin → Products.
                              </div>
                            );
                          }

                          return (
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                                gap: 12,
                              }}
                            >
                              {picks.map((p) => (
                                <div key={p.id} style={{ minWidth: 0 }}>
                                  <ProductCard
                                    product={p}
                                    enableModal={false}
                                    showDetailsButton={false}
                                    showAccordsInline={true}
                                  />
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="fruit_section layout_padding">
        <div className="container">
          <div className="heading_container">
            <hr />
            <h2>Featured Fragrances</h2>
          </div>
        </div>
        <div className="container-fluid">
          <div className="fruit_container">
            {featuredLoading ? (
              <p className="text-center py-5" style={{ color: '#888' }}>
                Loading fragrances…
              </p>
            ) : featured.length > 0 ? (
              featured.map((p) => <ProductCard key={p.id} product={p} />)
            ) : (
              [
                { id: 's1', name: 'Citrus Bloom', img: '/f-1.jpg' },
                { id: 's2', name: 'Velvet Berry', img: '/f-2.jpg' },
                { id: 's3', name: 'Golden Vanilla', img: '/f-3.jpg' },
                { id: 's4', name: 'Crisp Orchard', img: '/f-4.jpg' },
                { id: 's5', name: 'Mango Amber', img: '/f-5.jpg' },
                { id: 's6', name: 'Rose Strawberry', img: '/f-6.jpg' },
              ].map(({ id, name, img }) => (
                <div key={id} className="box">
                  <img src={img} alt={name} />
                  <div className="link_box">
                    <h5>{name}</h5>
                    <Link href="/shop">Buy Now</Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="client_section layout_padding-bottom">
        <div className="container">
          <div className="heading_container">
            <h2>What Our Customers Say</h2>
            <hr />
          </div>
          <div id="carouselTestimonials" className="carousel slide" data-bs-ride="carousel">
            <div className="carousel-inner">
              {[
                { name: 'Sophie L.', text: 'Absolutely love my purchase! The fragrance lasts all day.' },
                { name: 'James K.', text: 'Fast delivery, beautiful packaging, and the perfume smells incredible.' },
                { name: 'Amina R.', text: 'The best online perfume store. Great selection and excellent customer service.' },
              ].map((t, i) => (
                <div key={i} className={i === 0 ? 'carousel-item active' : 'carousel-item'}>
                  <div className="client_container layout_padding-top">
                    <div className="img-box">
                      <img src="/client-img.png" alt={t.name} />
                    </div>
                    <div className="detail-box">
                      <h5>{t.name}</h5>
                      <p>
                        <img src="/left-quote.png" alt="" />
                        <span> {t.text} </span>
                        <img src="/right-quote.png" alt="" />
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="carousel-control-prev" type="button" data-bs-target="#carouselTestimonials" data-bs-slide="prev">
              <span className="sr-only">Previous</span>
            </button>
            <button className="carousel-control-next" type="button" data-bs-target="#carouselTestimonials" data-bs-slide="next">
              <span className="sr-only">Next</span>
            </button>
          </div>
        </div>
      </section>

      <section className="contact_section layout_padding-bottom">
        <div className="container-fluid">
          <div className="row">
            <div className="offset-lg-2 col-md-10 offset-md-1">
              <div className="heading_container">
                <hr />
                <h2>Request A Call Back</h2>
              </div>
            </div>
          </div>
          <div className="layout_padding2-top">
            <div className="row">
              <div className="col-lg-4 offset-lg-2 col-md-5 offset-md-1">
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="contact_form-container">
                    <div>
                      <div><input type="text" placeholder="Full Name" /></div>
                      <div><input type="email" placeholder="Email" /></div>
                      <div><input type="text" placeholder="Phone Number" /></div>
                      <div><input type="text" className="message_input" placeholder="Message" /></div>
                      <div><button type="submit">Send</button></div>
                    </div>
                  </div>
                </form>
              </div>
              <div className="col-md-6 px-0">
                <div className="map_container">
                  <div className="map-responsive">
                    <iframe
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2624.9914406081493!2d2.2922926!3d48.8583736!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47e66e2964e34e2d%3A0x8ddca9ee380ef7e0!2sEiffel%20Tower!5e0!3m2!1sen!2sfr!4v1614271959976!5m2!1sen!2sfr"
                      width="600"
                      height="300"
                      style={{ border: 0, width: '100%', height: '100%' }}
                      allowFullScreen=""
                      loading="lazy"
                      title="Map"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
