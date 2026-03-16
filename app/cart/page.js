'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useCart } from '@/context/CartContext';
import { getCloudinaryUrl } from '@/lib/cloudinary';

export default function CartPage() {
  const { cart, removeFromCart, updateQty, totalPrice } = useCart();

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
            <h2>Your Cart</h2>
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-5">
              <p style={{ color: '#888', fontSize: '18px' }}>Your cart is empty.</p>
              <Link
                href="/shop"
                className="btn mt-3"
                style={{ background: '#f9a51e', color: '#fff', padding: '10px 30px', borderRadius: '4px' }}
              >
                Browse Fragrances
              </Link>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table">
                  <thead style={{ background: '#252525', color: '#fff' }}>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Qty</th>
                      <th>Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            <img
                              src={getCloudinaryUrl(item.image, 80)}
                              alt={item.name}
                              style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }}
                              onError={(e) => { e.target.src = '/f-1.jpg'; }}
                            />
                            <div>
                              <strong>{item.name}</strong>
                              <br />
                              <small style={{ color: '#888' }}>{item.brand} · {item.size}</small>
                            </div>
                          </div>
                        </td>
                        <td>${item.price}</td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <button
                              onClick={() => updateQty(item.id, item.qty - 1)}
                              style={{ width: 28, height: 28, background: '#eee', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                            >
                              −
                            </button>
                            <span>{item.qty}</span>
                            <button
                              onClick={() => updateQty(item.id, item.qty + 1)}
                              style={{ width: 28, height: 28, background: '#eee', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td>${(item.price * item.qty).toFixed(2)}</td>
                        <td>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer', fontSize: 18 }}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-flex justify-content-end align-items-center gap-4 mt-3">
                <h4>Total: <strong style={{ color: '#f9a51e' }}>${totalPrice.toFixed(2)}</strong></h4>
                <Link
                  href="/checkout"
                  className="btn"
                  style={{ background: '#f9a51e', color: '#fff', padding: '10px 30px', borderRadius: '4px' }}
                >
                  Proceed to Checkout
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
