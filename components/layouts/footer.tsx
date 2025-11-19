import Link from "next/link";
import { Facebook, Instagram, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer className="bg-[#f8f9fa] border-t border-[var(--color-card-border)] mt-20">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Social */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl font-bold text-[var(--color-brand-green)]">✱</span>
              <span className="text-xl font-bold text-[var(--color-text-primary)]">MUED</span>
            </div>
            <div className="flex gap-3">
              <Link href="#" className="text-gray-600 hover:text-[var(--color-brand-green)]" aria-label="Visit our Facebook page">
                <Facebook className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-gray-600 hover:text-[var(--color-brand-green)]" aria-label="Visit our Instagram page">
                <Instagram className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-gray-600 hover:text-[var(--color-brand-green)]" aria-label="Visit our Twitter page">
                <Twitter className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Resources</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-sm text-gray-600 hover:text-[var(--color-brand-green)]">Help Center</Link></li>
              <li><Link href="#" className="text-sm text-gray-600 hover:text-[var(--color-brand-green)]">Contact Us</Link></li>
              <li><Link href="#" className="text-sm text-gray-600 hover:text-[var(--color-brand-green)]">Privacy Policy</Link></li>
              <li><Link href="#" className="text-sm text-gray-600 hover:text-[var(--color-brand-green)]">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Company</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-sm text-gray-600 hover:text-[var(--color-brand-green)]">About Us</Link></li>
              <li><Link href="#" className="text-sm text-gray-600 hover:text-[var(--color-brand-green)]">Careers</Link></li>
              <li><Link href="#" className="text-sm text-gray-600 hover:text-[var(--color-brand-green)]">Blog</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Subscribe to our newsletter</h3>
            <p className="text-sm text-gray-600 mb-4">Stay updated with the latest news</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Email address"
                className="flex-1 px-3 py-2 text-sm border border-[var(--color-card-border)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-green)]"
              />
              <Button size="sm">Subscribe</Button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
