import React from "react";
import { Link } from "react-router-dom";
import { Home, Phone, MapPin } from "lucide-react";

export default function PublicFooter() {
  return (
    <footer className="bg-[#020617] text-neutral-400 py-20 border-t border-white/5 mt-auto transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Home className="text-white w-4 h-4" />
            </div>
            <span className="text-xl font-bold text-white">SmartRental</span>
          </div>

          <p className="mb-6 max-w-xs leading-relaxed text-sm">
            The premier platform for finding and managing high-end rental properties effortlessly.
          </p>

          <div className="flex flex-col gap-2 text-sm">
            <span className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              9827376839
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Tarai, Nepal
            </span>
          </div>
        </div>

        <div>
          <h4 className="text-white font-bold mb-6">Quick Links</h4>

          <ul className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm font-semibold">
            <li>
              <Link to="/" className="text-white/85 hover:text-blue-400 transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link to="/listings" className="text-white/85 hover:text-blue-400 transition-colors">
                Property Listings
              </Link>
            </li>
            <li>
              <Link to="/about" className="text-white/85 hover:text-blue-400 transition-colors">
                About Us
              </Link>
            </li>
            <li>
              <Link to="/auth" className="text-white/85 hover:text-blue-400 transition-colors">
                Agent Portal
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 mt-16 pt-8 border-t border-neutral-800 text-sm flex flex-col md:flex-row justify-between items-center text-neutral-500">
        <p>© 2026 SmartRental Platform. All rights reserved.</p>
        <div className="flex gap-4 mt-4 md:mt-0">
          <span className="hover:text-white cursor-pointer transition-colors">Fb</span>
          <span className="hover:text-white cursor-pointer transition-colors">Tw</span>
          <span className="hover:text-white cursor-pointer transition-colors">In</span>
        </div>
      </div>
    </footer>
  );
}