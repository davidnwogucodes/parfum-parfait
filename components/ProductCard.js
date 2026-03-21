'use client';

import { useState } from 'react';
import { getCloudinaryUrl } from '@/lib/cloudinary';
import { useCart } from '@/context/CartContext';

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function colorForAccord(label) {
  const key = String(label || '').toLowerCase().trim();
  // Nude / muted palette (warm, modern, playful without neon)
  const map = {
    sweet: '#E6A7A1', // blush rose
    vanilla: '#E9D8B8', // warm cream
    powdery: '#DCCFC6', // soft beige-grey
    tropical: '#E8C6A1', // apricot nude
    fruity: '#E2A37F', // peach terracotta
    citrus: '#E7D6A7', // pale golden sand
    floral: '#E7B7C7', // dusty pink
    musky: '#CBB8B0', // taupe nude
    woody: '#C4A38A', // warm caramel wood
    smoky: '#B9AFA8', // warm smoke
    spicy: '#D1A08B', // cinnamon nude
    'fresh spicy': '#C9BCA7', // sage-beige
    green: '#BFC7B6', // muted sage
    aromatic: '#B7C3C1', // cool grey-teal
    fresh: '#C5CED6', // misty blue-grey
    amber: '#D7B08A', // amber nude
    leather: '#BFA38E', // soft leather
    ozonic: '#C9D3D8', // airy grey-blue
  };
  return map[key] || '#C9BDB5'; // default nude grey
}

export default function ProductCard({
  product,
  enableModal = true,
  showDetailsButton = true,
  showAccordsInline = false,
}) {
  const { addToCart } = useCart();
  const { name, brand, price, size, image, accords, description, notes } = product;
  const [added, setAdded] = useState(false);
  const [open, setOpen] = useState(false);

  const imgSrc = getCloudinaryUrl(image, 400);

  const handleAdd = () => {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <>
      <div
        className="box pp_product_card"
        style={{
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
      <img
        src={imgSrc}
        alt={name}
        style={{ width: '100%', height: 'var(--pp-card-img-h, 220px)', objectFit: 'cover', display: 'block' }}
        onError={(e) => { e.target.src = '/placeholder.svg'; }}
        onClick={enableModal ? () => setOpen(true) : undefined}
        role={enableModal ? 'button' : undefined}
        tabIndex={enableModal ? 0 : undefined}
        onKeyDown={
          enableModal
            ? (e) => {
                if (e.key === 'Enter') setOpen(true);
              }
            : undefined
        }
      />
      {/* Info always visible below image */}
      <div
        className="pp_product_info"
        style={{
          padding: '8px 10px 3px',
          background: '#252525',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          minHeight: showAccordsInline ? 'var(--pp-card-info-min-h, 210px)' : undefined,
        }}
      >
        <h5
          style={{
            marginBottom: '2px',
            fontSize: '14px',
            textTransform: 'uppercase',
            minHeight: 18,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
          }}
          title={name}
        >
          {name}
        </h5>
        <small
          style={{
            color: '#aaa',
            minHeight: 16,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
          }}
          title={brand ? `${brand} · ${size || ''}` : (size || '')}
        >
          {brand ? `${brand} · ${size}` : (size || '')}
        </small>
        <p style={{ fontWeight: 'bold', margin: '4px 0 8px', color: '#f9a51e' }}>${price}</p>
        {showAccordsInline && (
          <div
            style={{
              margin: '6px 0 10px',
              display: 'grid',
              gap: 6,
              padding: 8,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            {Array.isArray(accords) && accords.length > 0 ? (
              accords.slice(0, 4).map((a, idx) => {
                const label = a?.label ?? '';
                const strength = clamp(Number(a?.strength ?? 3), 1, 5);
                const width = `${(strength / 5) * 100}%`;
                const bg = colorForAccord(label);
                return (
                  <div
                    key={`${label}-${idx}`}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 999,
                      overflow: 'hidden',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
                    }}
                    title={`${label} ${strength}/5`}
                  >
                    <div
                      style={{
                        width,
                        background: `linear-gradient(135deg, ${bg} 0%, rgba(255,255,255,0.22) 55%, ${bg} 100%)`,
                        color: 'rgba(17,17,17,0.92)',
                        padding: '6px 10px',
                        fontWeight: 700,
                        textTransform: 'lowercase',
                        fontSize: 12,
                        position: 'relative',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background:
                            'linear-gradient(120deg, rgba(255,255,255,0.0), rgba(255,255,255,0.28), rgba(255,255,255,0.0))',
                          opacity: 0.55,
                          pointerEvents: 'none',
                        }}
                      />
                      {String(label).toLowerCase()}
                    </div>
                  </div>
                );
              })
            ) : (
              <>
                {['accords not set', '—', '—'].map((t, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      borderRadius: 999,
                      overflow: 'hidden',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                    }}
                    title="Accords not set for this product yet"
                  >
                    <div
                      style={{
                        width: idx === 0 ? '62%' : idx === 1 ? '48%' : '36%',
                        background:
                          'linear-gradient(135deg, rgba(201,189,181,0.55), rgba(255,255,255,0.12), rgba(201,189,181,0.55))',
                        color: 'rgba(255,255,255,0.72)',
                        padding: '6px 10px',
                        fontWeight: 600,
                        textTransform: 'lowercase',
                        fontSize: 12,
                      }}
                    >
                      {t}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {enableModal && showDetailsButton && (
          <button
            onClick={() => setOpen(true)}
            className="pp_glass_btn pp_glass_btn_dark"
            style={{ width: '100%', marginBottom: 6, padding: '7px 0', textTransform: 'uppercase', fontSize: 13 }}
          >
            Details
          </button>
        )}
        <button
          onClick={handleAdd}
          className={`pp_glass_btn pp_glass_btn_dark${added ? ' pp_glass_btn_success' : ''}`}
          style={{ width: '100%', marginBottom: 6, padding: '7px 0', marginTop: showAccordsInline ? 'auto' : undefined, fontSize: 13 }}
        >
          {added ? '✓ Added!' : 'Add to Cart'}
        </button>
      </div>
    </div>

      {enableModal && open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${name} details`}
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(920px, 100%)',
              background: 'rgba(25,25,25,0.9)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 12,
              overflow: 'hidden',
              color: '#fff',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                  {brand ? `${brand} · ` : ''}{size || ''}
                </div>
                <div style={{ fontSize: 20, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{name}</div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.25)',
                  color: '#fff',
                  borderRadius: 8,
                  padding: '6px 10px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 0 }}>
              <div style={{ background: 'rgba(255,255,255,0.03)' }}>
                <img
                  src={imgSrc}
                  alt={name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', minHeight: 320 }}
                  onError={(e) => { e.target.src = '/placeholder.svg'; }}
                />
              </div>

              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>${Number(price || 0).toFixed(2)}</div>
                  <button
                    onClick={handleAdd}
                    className="pp_glass_btn pp_glass_btn_dark"
                    style={{ padding: '10px 18px' }}
                  >
                    Add to Cart
                  </button>
                </div>

                {(description || notes) && (
                  <div style={{ marginTop: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                    {description && <div style={{ marginBottom: 8 }}>{description}</div>}
                    {notes && (
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                        {notes}
                      </div>
                    )}
                  </div>
                )}

                {Array.isArray(accords) && accords.length > 0 && (
                  <div style={{ marginTop: 18 }}>
                    <div style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10, color: 'rgba(255,255,255,0.8)' }}>
                      Main accords
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {accords.map((a, idx) => {
                        const label = a?.label ?? '';
                        const strength = clamp(Number(a?.strength ?? 3), 1, 5);
                        const width = `${(strength / 5) * 100}%`;
                        const bg = colorForAccord(label);
                        return (
                          <div key={`${label}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)' }}>
                              <div
                                style={{
                                  width,
                                  background: bg,
                                  color: '#111',
                                  padding: '8px 12px',
                                  fontWeight: 700,
                                  textTransform: 'lowercase',
                                }}
                              >
                                {String(label).toLowerCase()}
                              </div>
                            </div>
                            <div style={{ width: 34, textAlign: 'right', color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
                              {strength}/5
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
