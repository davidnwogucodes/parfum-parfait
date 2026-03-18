'use client';

export default function Loading() {
  return (
    <div className="pp_loader" role="status" aria-live="polite" aria-label="Loading">
      <div className="pp_loader_inner">
        <svg
          className="pp_loader_svg"
          viewBox="0 0 900 520"
          width="520"
          height="300"
          aria-hidden="true"
        >
          {/* baseline (continuous line) */}
          <path className="pp_draw" style={{ '--d': '0ms' }} d="M40 452 H860" />

          {/* left bottle (outline) */}
          <path
            className="pp_draw"
            style={{ '--d': '220ms' }}
            d="M250 98
               C250 84 262 74 276 74
               H332
               C346 74 358 84 358 98
               V136
               C358 150 346 162 332 162
               H276
               C262 162 250 150 250 136
               Z"
          />
          <path
            className="pp_draw"
            style={{ '--d': '420ms' }}
            d="M232 150
               C232 128 250 110 272 110
               H336
               C358 110 376 128 376 150
               V410
               C376 438 354 460 326 460
               H244
               C216 460 194 438 194 410
               V176
               C194 156 206 144 226 144
               C230 144 232 146 232 150
               Z"
          />

          {/* left bottle (inner line + label curve) */}
          <path
            className="pp_draw"
            style={{ '--d': '780ms' }}
            d="M220 188
               C214 212 214 238 214 266
               V400"
          />
          <path
            className="pp_draw"
            style={{ '--d': '980ms' }}
            d="M230 310
               C256 288 292 284 322 290
               C348 296 360 308 360 328"
          />

          {/* right tilted bottle (outline) */}
          <path
            className="pp_draw"
            style={{ '--d': '1180ms' }}
            d="M540 250
               L660 172
               C676 162 698 166 708 184
               L806 356
               C816 374 808 396 790 406
               L646 478
               C628 488 606 480 596 462
               L498 288
               C488 270 496 258 514 248
               Z"
          />

          {/* right bottle neck/cap */}
          <path
            className="pp_draw"
            style={{ '--d': '1480ms' }}
            d="M528 244
               L494 214
               C480 202 482 182 498 172
               L538 148"
          />
          <path
            className="pp_draw"
            style={{ '--d': '1680ms' }}
            d="M494 206
               L548 172
               L568 204
               L514 238
               Z"
          />
        </svg>

        <div className="pp_loader_brand">Parfum-Parfait</div>
      </div>
    </div>
  );
}

