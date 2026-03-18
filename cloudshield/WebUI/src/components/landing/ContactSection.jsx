// src/pages/ContactSection.jsx
import React from 'react';

const ContactSection = () => {
  return (
    <section id="contact" className="landing-contact-section">
      <div className="landing-contact-container">
        <div className="landing-contact-header">
          <h2 className="landing-contact-title">
            Get in <span className="touch">Touch</span> with us
          </h2>
          <p className="landing-contact-subtitle">
            We&apos;re here to help! Whether you have questions, feedback, or need support, our team is ready to assist
          </p>
        </div>

        <form className="landing-contact-form" onSubmit={(e) => e.preventDefault()}>
          <div className="landing-contact-row">
            <div className="landing-field">
              <label className="landing-label" htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                placeholder="Your first name"
                className="landing-input"
              />
            </div>

            <div className="landing-field">
              <label className="landing-label" htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                type="text"
                placeholder="Your last name"
                className="landing-input"
              />
            </div>
          </div>

          <div className="landing-field">
            <label className="landing-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Your email"
              className="landing-input"
            />
          </div>

          <div className="landing-field">
            <label className="landing-label" htmlFor="message">Message</label>
            <textarea
              id="message"
              placeholder="Write something..."
              className="landing-textarea"
            />
          </div>

          <button type="submit" className="landing-contact-submit">
            Send Message
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M3.5 11.2L20.3 4.2c.7-.3 1.4.4 1.1 1.1l-7 16.8c-.3.7-1.3.7-1.6 0l-2.2-5.2-5.2-2.2c-.7-.3-.7-1.3 0-1.5Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M10.8 13.2l3.7-3.7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </form>
      </div>
    </section>
  );
};

export default ContactSection;