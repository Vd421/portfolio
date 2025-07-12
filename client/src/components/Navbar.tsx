import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleScrollTo = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      const offsetTop = element.offsetTop - 64; // Account for fixed navbar
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
    setMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="font-bold text-xl text-slate-800">
            <span className="text-blue-600">Vaibhav</span> Dhir
          </div>
          <div className="hidden md:flex space-x-8">
            <button 
              onClick={() => handleScrollTo('hero')}
              className="text-slate-600 hover:text-blue-600 transition-colors duration-300 font-medium"
            >
              Home
            </button>
            <button 
              onClick={() => handleScrollTo('about')}
              className="text-slate-600 hover:text-blue-600 transition-colors duration-300 font-medium"
            >
              About
            </button>
            <button 
              onClick={() => handleScrollTo('skills')}
              className="text-slate-600 hover:text-blue-600 transition-colors duration-300 font-medium"
            >
              Skills
            </button>
            <button 
              onClick={() => handleScrollTo('projects')}
              className="text-slate-600 hover:text-blue-600 transition-colors duration-300 font-medium"
            >
              Projects
            </button>
            <button 
              onClick={() => handleScrollTo('experience')}
              className="text-slate-600 hover:text-blue-600 transition-colors duration-300 font-medium"
            >
              Experience
            </button>
            <button 
              onClick={() => handleScrollTo('contact')}
              className="text-slate-600 hover:text-blue-600 transition-colors duration-300 font-medium"
            >
              Contact
            </button>
          </div>
          <div className="md:hidden">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-600 hover:text-blue-600 focus:outline-none"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <button 
              onClick={() => handleScrollTo('hero')}
              className="block w-full text-left px-3 py-2 text-slate-600 hover:text-blue-600 transition-colors duration-300"
            >
              Home
            </button>
            <button 
              onClick={() => handleScrollTo('about')}
              className="block w-full text-left px-3 py-2 text-slate-600 hover:text-blue-600 transition-colors duration-300"
            >
              About
            </button>
            <button 
              onClick={() => handleScrollTo('skills')}
              className="block w-full text-left px-3 py-2 text-slate-600 hover:text-blue-600 transition-colors duration-300"
            >
              Skills
            </button>
            <button 
              onClick={() => handleScrollTo('projects')}
              className="block w-full text-left px-3 py-2 text-slate-600 hover:text-blue-600 transition-colors duration-300"
            >
              Projects
            </button>
            <button 
              onClick={() => handleScrollTo('experience')}
              className="block w-full text-left px-3 py-2 text-slate-600 hover:text-blue-600 transition-colors duration-300"
            >
              Experience
            </button>
            <button 
              onClick={() => handleScrollTo('contact')}
              className="block w-full text-left px-3 py-2 text-slate-600 hover:text-blue-600 transition-colors duration-300"
            >
              Contact
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
