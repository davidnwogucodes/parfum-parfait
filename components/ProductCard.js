'use client';

import { useState } from 'react';
import { getCloudinaryUrl } from '@/lib/cloudinary';
import { useCart } from '@/context/CartContext';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { name, brand, price, size, image } = product;
  const [added, setAdded] = useState(false);

  const imgSrc = getCloudinaryUrl(image, 400);

  const handleAdd = () => {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="box" style={{ position: 'relative', overflow: 'hidden' }}>
      <img
        src={imgSrc}
        alt={name}
        style={{ width: '100%', height: '220px', objectFit: 'cover', display: 'block' }}
        onError={(e) => { e.target.src = '/f-1.jpg'; }}
      />
      {/* Info always visible below image */}
      <div style={{ padding: '10px 12px 4px', background: '#252525', color: '#fff' }}>
        <h5 style={{ marginBottom: '2px', fontSize: '14px', textTransform: 'uppercase' }}>{name}</h5>
        {brand && <small style={{ color: '#aaa' }}>{brand} · {size}</small>}
        <p style={{ fontWeight: 'bold', margin: '4px 0 8px', color: '#f9a51e' }}>${price}</p>
        <button
          onClick={handleAdd}
          style={{
            display: 'block',
            width: '100%',
            padding: '7px 0',
            background: added ? '#28a745' : 'transparent',
            border: '1px solid #fff',
            color: '#fff',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'background 0.2s',
            marginBottom: '8px',
          }}
        >
          {added ? '✓ Added!' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}
