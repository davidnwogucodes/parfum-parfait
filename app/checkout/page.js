'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useCart } from '@/context/CartContext';
import { getCloudinaryUrl } from '@/lib/cloudinary';

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbx90KVmZw0yinE-XMUkllHEmh7t_jp3Yd9hsESFbqpEVSmZnnGRxWa0t96Hxt-nB6ij/exec';

export default function CheckoutPage() {
  const { cart, totalPrice, clearCart } = useCart();
  const router = useRouter();

  const [form, setForm] = useState({ customer_name: '', phone: '', address: '' });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error'

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setSubmitting(true);
    setStatus(null);

    const orderData = {
      timestamp: new Date().toISOString(),
      customer_name: form.customer_name,
      phone: form.phone,
      address: form.address,
      items: JSON.stringify(
        cart.map((i) => `${i.name} x${i.qty}`)
      ),
      total_price: totalPrice.toFixed(2),
    };

    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // GAS doesn't set CORS headers by default
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      clearCart();
      setStatus('success');
      setTimeout(() => router.push('/'), 3000);
    } catch {
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

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

      <section className="layout_padding">
        <div className="container">
          <div className="heading_container mb-4">
            <hr />
            <h2>Checkout</h2>
          </div>

          {status === 'success' && (
            <div className="alert alert-success" role="alert">
              🎉 Order placed successfully! We&apos;ll be in touch soon. Redirecting…
            </div>
          )}
          {status === 'error' && (
            <div className="alert alert-danger" role="alert">
              Something went wrong. Please try again or contact us directly.
            </div>
          )}

          {cart.length === 0 && status !== 'success' ? (
            <p className="text-center py-4" style={{ color: '#888' }}>
              Your cart is empty. <a href="/shop" style={{ color: '#f9a51e' }}>Go shopping</a>.
            </p>
          ) : (
            <div className="row">
              {/* Order form */}
              <div className="col-md-6 mb-4">
                <h5 className="mb-3">Delivery Details</h5>
                <form onSubmit={handleSubmit}>
                  <div className="contact_form-container">
                    <div>
                      <div>
                        <input
                          type="text"
                          name="customer_name"
                          placeholder="Full Name"
                          value={form.customer_name}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div>
                        <input
                          type="tel"
                          name="phone"
                          placeholder="Phone Number"
                          value={form.phone}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          name="address"
                          className="message_input"
                          placeholder="Delivery Address"
                          value={form.address}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div>
                        <button type="submit" disabled={submitting}>
                          {submitting ? 'Placing Order…' : 'Place Order'}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              {/* Order summary */}
              <div className="col-md-6">
                <h5 className="mb-3">Order Summary</h5>
                <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
                  {cart.map((item) => (
                    <div key={item.id} className="d-flex align-items-center gap-3 mb-3">
                      <img
                        src={getCloudinaryUrl(item.image, 60)}
                        alt={item.name}
                        style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }}
                        onError={(e) => { e.target.src = '/f-1.jpg'; }}
                      />
                      <div style={{ flex: 1 }}>
                        <strong>{item.name}</strong>
                        <br />
                        <small style={{ color: '#888' }}>{item.qty} × ${item.price}</small>
                      </div>
                      <span style={{ color: '#f9a51e', fontWeight: 'bold' }}>
                        ${(item.price * item.qty).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <hr />
                  <div className="d-flex justify-content-between">
                    <strong>Total</strong>
                    <strong style={{ color: '#f9a51e' }}>${totalPrice.toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
