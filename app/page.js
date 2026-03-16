'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ProductCard from '@/components/ProductCard';

export default function HomePage() {
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => setFeatured((data.products || []).slice(0, 6)))
      .catch(() => {});
  }, []);

  return (
    <>
      {/* Hero */}
      <div className="hero_area">
        <div className="brand_box">
          <a className="navbar-brand" href="/">
            <span>Parfum-Parfait</span>
          </a>
        </div>
        <section className="slider_section position-relative">
          <div id="carouselHero" className="carousel slide" data-bs-ride="carousel">
            <div className="carousel-inner">
              {[0, 1, 2].map((i) => (
                <div key={i} className={i === 0 ? 'carousel-item active' : 'carousel-item'}>
                  <div className="img-box">
                    <img src="/slider-img.jpg" alt="Parfum-Parfait" />
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
        </section>
      </div>

      <Navbar />

      <section className="shop_section layout_padding">
        <div className="container">
          <div className="box">
            <div className="detail-box">
              <h2>Parfum-Parfait</h2>
              <p>Discover the world finest fragrances, curated for you.</p>
            </div>
            <div className="img-box">
              <img src="/shop-img.jpg" alt="Shop" />
            </div>
            <div className="btn-box">
              <Link href="/shop">Shop Now</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="about_section">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-6 px-0">
              <div className="img-box">
                <img src="/about-img.jpg" alt="About" />
              </div>
            </div>
            <div className="col-md-5">
              <div className="detail-box">
                <div className="heading_container">
                  <hr />
                  <h2>About Parfum-Parfait</h2>
                </div>
                <p>
                  We bring you an exquisite collection of the world most prestigious perfumes.
                  From timeless classics to modern masterpieces, each fragrance tells a unique story.
                </p>
                <Link href="/about">Read More</Link>
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
            {featured.length > 0 ? (
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
