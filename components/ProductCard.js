'use client';

import { getCloudinaryUrl } from '@/lib/cloudinary';
import { useCart } from '@/context/CartContext';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { name, brand, price, size, image, category } = product;

  const imgSrc = getCloudinaryUrl(image, 400);

  return (
    <div className="box">
      <img
        src={imgSrc}
        alt={name}
        style={{ width: '100%', height: '220px', objectFit: 'cover' }}
        onError={(e) => { e.target.src = '/f-1.jpg'; }}
      />
      <div className="link_box">
        <div style={{ padding: '8px 0 4px' }}>
          <h5 style={{ marginBottom: '2px' }}>{name}</h5>
          {brand && <small style={{ color: '#888' }}>{brand} · {size}</small>}
          <p style={{ fontWeight: 'bold', margin: '6px 0 0', color: '#f9a51e' }}>
            ${price}
          </p>
        </div>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            addToCart(product);
          }}
        >
          Add to Cart
        </a>
      </div>
    </div>
  );
}
