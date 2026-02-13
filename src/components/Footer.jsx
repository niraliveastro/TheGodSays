"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from "lucide-react";
import "./Footer.css";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        {/* Main Footer */}
        <div className="footer-main">
          {/* Company Info */}
          <div className="footer-section footer-brand">
            <div className="footer-logo-title">
              <Image
                src="/favicon.png"
                alt="NiraLive Astro Logo"
                width={32}
                height={32}
                className="footer-logo"
              />
              <h3 className="footer-title">NiraLive Astro</h3>
            </div>
            <p className="footer-description">
              Your trusted platform for Vedic astrology, kundali, numerology, and live consultations with expert astrologers.
              Discover your destiny with ancient wisdom and modern technology.
            </p>
          </div>

          {/* Quick Links */}
          <div className="footer-section">
            <h4 className="footer-heading">Quick Links</h4>
            <ul className="footer-links">
              <li><Link href="/panchang">Panchang</Link></li>
              <li><Link href="/numerology">Numerology</Link></li>
              <li><Link href="/blog">Astrology Articles</Link></li>
              <li><Link href="/zodiac-today">Zodiac News</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div className="footer-section">
            <h4 className="footer-heading">Our Services</h4>
            <ul className="footer-links">
              <li><Link href="/kundli-prediction/">Personalized Readings</Link></li>
              <li><Link href="/kundli-matching/">Kundali Matching</Link></li>
              <li><Link href="/talk-to-astrologer">Talk to Astrologers</Link></li>
              <li><Link href="/talk-to-ai-astrologer">Talk to AI Astrologer</Link></li>
              <li><Link href="/talk-to-astrologer">Astrologer Profiles</Link></li>
            </ul>
          </div>

          {/* Contact & Legal */}
          <div className="footer-section">
            <h4 className="footer-heading">Contact Us</h4>
            <div className="footer-contact">
              <div className="contact-item">
                <Mail className="contact-icon" />
                <a href="mailto:support@niraliveastro.com">support@niraliveastro.com</a>
              </div>
              <div className="contact-item">
                <Phone className="contact-icon" />
                <a href="tel:+91XXXXXXXXXX">+91 XXXX XXXXXX</a>
              </div>
              <div className="contact-item">
                <MapPin className="contact-icon" />
                <span>India</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <p className="footer-copyright">
              NiraLive Astro © {currentYear} - Made with Love in India
            </p>
            <div className="footer-social footer-social-bottom">
              <a href="https://www.facebook.com/profile.php?id=61587143052795" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <Facebook />
              </a>
              <a href="https://twitter.com/niraliveastro" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                <Twitter />
              </a>
              <a href="https://instagram.com/niraliveastro" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <Instagram />
              </a>
              <a href="https://youtube.com/@niraliveastro" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                <Youtube />
              </a>
            </div>
            <div className="footer-legal">
              <Link href="/privacy-policy">Privacy Policy</Link>
              <span className="separator">•</span>
              <Link href="/terms-and-conditions">Terms & Conditions</Link>
              <span className="separator">•</span>
              <Link href="/refund-policy">Refund Policy</Link>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="footer-disclaimer">
          <p>
            <strong>Disclaimer:</strong> Astrological services provided on this platform are for entertainment and guidance purposes only.
            They should not be considered as professional advice for medical, legal, financial, or other critical life decisions.
            Results and predictions are interpretive and may vary. We do not guarantee accuracy or specific outcomes.
          </p>
        </div>
      </div>
    </footer>
  );
}
