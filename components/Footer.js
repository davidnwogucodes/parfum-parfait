'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <>
      <section className="info_section layout_padding">
        <div className="container">
          <div className="info_logo">
            <h2>Parfum-Parfait</h2>
          </div>
          <div className="info_contact">
            <div className="row">
              <div className="col-md-4">
                <a href="#">
                  <img src="/location.png" alt="Location" />
                  <span>Parkview Hotel Wuse Zone 1</span>
                </a>
              </div>
              <div className="col-md-4">
                <a href="tel:09041390497">
                  <img src="/call.png" alt="Phone" />
                  <span>Call : 09041390497</span>
                </a>
              </div>
              <div className="col-md-4">
                <a href="mailto:shopparfumparfait@gmail.com">
                  <img src="/mail.png" alt="Email" />
                  <span>shopparfumparfait@gmail.com</span>
                </a>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-md-4 col-lg-3">
              <div className="info_social">
                <div><a href="#"><img src="/facebook-logo-button.png" alt="Facebook" /></a></div>
                <div><a href="#"><img src="/twitter-logo-button.png" alt="Twitter" /></a></div>
                <div><a href="#"><img src="/linkedin.png" alt="LinkedIn" /></a></div>
                <div><a href="#"><img src="/instagram.png" alt="Instagram" /></a></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-fluid footer_section">
        <p>
          &copy; {new Date().getFullYear()} All Rights Reserved.{' '}
          <Link href="/">Parfum-Parfait</Link>
        </p>
      </section>
    </>
  );
}
