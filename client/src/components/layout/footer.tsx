export function Footer() {
  return (
    <footer className="border-t bg-card" data-testid="footer">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="font-serif text-lg font-bold" data-testid="text-footer-brand">SpoiltDogs</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Premium pet products for Australian dogs and their humans. Quality delivered Australia-wide.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold" data-testid="text-footer-shop">Shop</h4>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>All Products</li>
              <li>New Arrivals</li>
              <li>Best Sellers</li>
              <li>Sale</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold" data-testid="text-footer-support">Support</h4>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>Shipping &amp; Returns</li>
              <li>FAQ</li>
              <li>Contact Us</li>
              <li>Size Guide</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold" data-testid="text-footer-company">Company</h4>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>About Us</li>
              <li>Careers</li>
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground" data-testid="text-footer-copyright">
          &copy; {new Date().getFullYear()} SpoiltDogs. All rights reserved. ABN 00 000 000 000
        </div>
      </div>
    </footer>
  );
}
