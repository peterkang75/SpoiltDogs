import { Dog, MapPin, Phone, Mail } from "lucide-react";
import { SiInstagram, SiFacebook, SiTiktok, SiAfterpay, SiVisa, SiMastercard, SiApplepay, SiGooglepay } from "react-icons/si";
import { Link } from "wouter";

export function SiteFooter() {
  return (
    <footer className="bg-dark text-cream/80" data-testid="site-footer">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-2">
              <Dog className="h-6 w-6 text-sage" />
              <span className="font-serif text-xl font-bold text-cream">SpoiltDogs</span>
            </Link>
            <p className="text-sm leading-relaxed text-cream/60">
              Premium pet products curated in Australia. Because your dog deserves the best.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-full bg-cream/10 hover:bg-cream/20 transition-colors" data-testid="link-social-instagram">
                <SiInstagram className="h-4 w-4" />
              </a>
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-full bg-cream/10 hover:bg-cream/20 transition-colors" data-testid="link-social-facebook">
                <SiFacebook className="h-4 w-4" />
              </a>
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-full bg-cream/10 hover:bg-cream/20 transition-colors" data-testid="link-social-tiktok">
                <SiTiktok className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Shop + About */}
          <div className="space-y-8">
            <div>
              <h4 className="text-sm font-semibold text-cream mb-4" data-testid="text-footer-shop">Shop</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/products" className="hover:text-cream transition-colors" data-testid="link-footer-all-products">All Products</Link></li>
                <li><a href="#" className="hover:text-cream transition-colors" data-testid="link-footer-dog-food">Dog Food</a></li>
                <li><a href="#" className="hover:text-cream transition-colors" data-testid="link-footer-accessories">Accessories</a></li>
                <li><a href="#" className="hover:text-cream transition-colors" data-testid="link-footer-grooming">Grooming</a></li>
                <li><a href="#" className="hover:text-cream transition-colors" data-testid="link-footer-gift-cards">Gift Cards</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-cream mb-4" data-testid="text-footer-about">About</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/our-story" className="hover:text-cream transition-colors" data-testid="link-footer-our-story">Our Story</Link></li>
                <li><a href="#blog" className="hover:text-cream transition-colors" data-testid="link-footer-blog">Blog</a></li>
                <li><a href="#ai-concierge" className="hover:text-cream transition-colors" data-testid="link-footer-concierge">AI Concierge</a></li>
              </ul>
            </div>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="text-sm font-semibold text-cream mb-4" data-testid="text-footer-customer-service">Customer Service</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/shipping-policy" className="hover:text-cream transition-colors" data-testid="link-footer-shipping">
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-cream transition-colors" data-testid="link-footer-refund">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-cream transition-colors" data-testid="link-footer-privacy">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-cream transition-colors" data-testid="link-footer-contact">
                  Contact Us
                </Link>
              </li>
              <li>
                <a href="#faq" className="hover:text-cream transition-colors" data-testid="link-footer-faq">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-cream transition-colors" data-testid="link-footer-terms">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-cream mb-4" data-testid="text-footer-contact">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-sage" />
                <span className="text-cream/60">Sydney, NSW<br />Australia</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-sage" />
                <span className="text-cream/60">1300 SPOILT</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-sage" />
                <a href="mailto:hello@spoiltdogs.com.au" className="text-cream/60 hover:text-cream transition-colors">
                  hello@spoiltdogs.com.au
                </a>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-12 border-t border-cream/10 pt-8 space-y-4" data-testid="footer-bottom">
          {/* Payment method logos */}
          <div className="flex items-center justify-center gap-2 flex-wrap" data-testid="footer-payment-icons">
            <span className="text-[10px] uppercase tracking-widest text-cream/25 mr-1">Secure payments via</span>
            {/* Afterpay */}
            <div
              className="inline-flex items-center gap-1 rounded px-2 py-1"
              style={{ backgroundColor: "#000" }}
              title="Afterpay"
              data-testid="footer-badge-afterpay"
            >
              <SiAfterpay className="h-3.5 w-3.5" style={{ color: "#B2FCE4" }} />
              <span className="text-[9px] font-bold" style={{ color: "#B2FCE4" }}>Afterpay</span>
            </div>
            {/* Apple Pay */}
            <div
              className="inline-flex items-center gap-1 rounded px-2 py-1"
              style={{ backgroundColor: "#000" }}
              title="Apple Pay"
              data-testid="footer-badge-apple-pay"
            >
              <SiApplepay className="h-4 w-4 text-white" />
            </div>
            {/* Google Pay */}
            <div
              className="inline-flex items-center gap-1 rounded px-2 py-1 bg-white"
              title="Google Pay"
              data-testid="footer-badge-google-pay"
            >
              <SiGooglepay className="h-4 w-4" style={{ color: "#4285F4" }} />
            </div>
            {/* Visa */}
            <div
              className="inline-flex items-center gap-1 rounded px-2 py-1 bg-white"
              title="Visa"
              data-testid="footer-badge-visa"
            >
              <SiVisa className="h-3.5 w-3.5" style={{ color: "#1A1F71" }} />
            </div>
            {/* Mastercard */}
            <div
              className="inline-flex items-center gap-1 rounded px-2 py-1 bg-white"
              title="Mastercard"
              data-testid="footer-badge-mastercard"
            >
              <SiMastercard className="h-3.5 w-3.5" style={{ color: "#EB001B" }} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-cream/40">
              &copy; {new Date().getFullYear()} SpoiltDogs Pty Ltd. All rights reserved. &nbsp;ABN 68 591 412 721 &nbsp;·&nbsp; <a href="mailto:hello@spoiltdogs.com.au" className="hover:text-cream/60 transition-colors">hello@spoiltdogs.com.au</a>
            </p>
            <div className="flex items-center gap-5 text-xs text-cream/40 flex-wrap justify-center">
              <span>Proudly Australian</span>
              <span className="hidden sm:inline text-cream/20">|</span>
              <Link href="/shipping-policy" className="hover:text-cream/60 transition-colors">Shipping</Link>
              <Link href="/refund-policy" className="hover:text-cream/60 transition-colors">Refunds</Link>
              <Link href="/privacy-policy" className="hover:text-cream/60 transition-colors">Privacy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
