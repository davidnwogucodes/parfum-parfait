'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ProductCard from '@/components/ProductCard';

const CATEGORIES = ['all', 'men', 'women', 'unisex'];

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products || []);
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to load products. Please try again later.');
        setLoading(false);
      });
  }, []);

  const filtered =
    activeCategory === 'all'
      ? products
      : products.filter((p) => p.category === activeCategory);

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

      <section className="fruit_section layout_padding">
        <div className="container">
          <div className="heading_container">
            <hr />
            <h2>Our Fragrances</h2>
          </div>

          {/* Category Filter */}
          <div className="d-flex gap-2 mt-3 mb-4 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="btn"
                style={{
                  background: activeCategory === cat ? '#f9a51e' : '#252525',
                  color: '#fff',
                  textTransform: 'capitalize',
                  borderRadius: '4px',
                  padding: '6px 18px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="container-fluid">
          {loading && (
            <p className="text-center py-5" style={{ color: '#888' }}>
              Loading fragrances…
            </p>
          )}
          {error && (
            <p className="text-center py-5" style={{ color: 'red' }}>
              {error}
            </p>
          )}
          {!loading && !error && filtered.length === 0 && (
            <p className="text-center py-5" style={{ color: '#888' }}>
              No products found in this category.
            </p>
          )}
          {!loading && !error && (
            <div className="fruit_container">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
