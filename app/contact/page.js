'use client';

import Navbar from '@/components/Navbar';

export default function ContactPage() {
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

      <section className="contact_section layout_padding">
        <div className="container-fluid">
          <div className="row">
            <div className="offset-lg-2 col-md-10 offset-md-1">
              <div className="heading_container">
                <hr />
                <h2>Get In Touch</h2>
              </div>
            </div>
          </div>

          <div className="layout_padding2-top">
            <div className="row">
              <div className="col-lg-4 offset-lg-2 col-md-5 offset-md-1">
                <form action="">
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
                      title="Store location map"
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
