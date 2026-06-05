import { Link } from "react-router-dom";

const Footer = () => (<footer className="relative mt-10 overflow-hidden border-t border-orange-100 bg-[linear-gradient(180deg,hsl(34_100%_99%)_0%,hsl(28_88%_95%)_100%)]">
    <div className="hero-grid-overlay absolute inset-0 opacity-20"/>
    <div className="container py-12">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h3 className="font-heading text-2xl font-bold text-orange-600">Servify</h3>
          <p className="mt-2 text-sm text-slate-600">
            Flipkart-style service marketplace for daily life help and employee hiring in one app.
          </p>
          <p className="mt-3 inline-flex rounded-full border border-orange-200 bg-white/70 px-3 py-1 text-xs font-semibold text-orange-700">
            Built for instant service discovery
          </p>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-slate-900">Popular Categories</h4>
          <div className="mt-2 flex flex-col gap-1 text-sm text-slate-600">
            <Link to="/services?category=Home%20Repairs" className="transition-colors hover:text-orange-600">Home Repairs</Link>
            <Link to="/services?category=Cleaning" className="transition-colors hover:text-orange-600">Cleaning</Link>
            <Link to="/services?category=Digital%20Services" className="transition-colors hover:text-orange-600">Digital Services</Link>
            <Link to="/services?category=Travel%20%26%20Logistics" className="transition-colors hover:text-orange-600">Travel & Logistics</Link>
          </div>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-slate-900">Professional Roles</h4>
          <div className="mt-2 flex flex-col gap-1 text-sm text-slate-600">
            <Link to="/services?category=Home%20Staffing" className="transition-colors hover:text-orange-600">Home Staffing</Link>
            <Link to="/services?category=Office%20Staffing" className="transition-colors hover:text-orange-600">Office Staffing</Link>
            <Link to="/services?category=Healthcare%20Roles" className="transition-colors hover:text-orange-600">Healthcare Roles</Link>
            <Link to="/services?category=Specialized%20Experts" className="transition-colors hover:text-orange-600">Specialized Experts</Link>
          </div>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-slate-900">Account</h4>
          <div className="mt-2 flex flex-col gap-1 text-sm text-slate-600">
            <Link to="/auth" className="transition-colors hover:text-orange-600">Signup / Login</Link>
            <Link to="/career" className="transition-colors hover:text-orange-600">Career Portal</Link>
            <Link to="/plans" className="transition-colors hover:text-orange-600">Subscription Plans</Link>
            <Link to="/analytics" className="transition-colors hover:text-orange-600">Analytics Dashboard</Link>
            <Link to="/services" className="transition-colors hover:text-orange-600">Browse Services</Link>
            <Link to="/my-bookings" className="transition-colors hover:text-orange-600">My Bookings</Link>
          </div>
        </div>
      </div>
      <div className="mt-8 border-t border-orange-100 pt-6 text-center text-sm text-slate-600">
        © 2026 Servify. All rights reserved.
      </div>
    </div>
  </footer>);

export default Footer;
