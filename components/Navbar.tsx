
import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, Menu, Search, User, X, LogIn, LogOut, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
  onHomeClick: () => void;
  isAuthenticated: boolean;
  userName?: string;
  onAuthClick: () => void;
  onLogoutClick: () => void;
}

const logoUrl = new URL('./1.png', import.meta.url).href;

const Navbar: React.FC<NavbarProps> = ({ onHomeClick, isAuthenticated, userName, onAuthClick, onLogoutClick }) => {
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Close profile dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
        window.removeEventListener('scroll', handleScroll);
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, []);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 md:pt-6 px-4 pointer-events-none">
        <div className={`
          pointer-events-auto
          relative flex items-center justify-between px-3 pl-3 pr-4 md:pr-6 py-2.5 rounded-full 
          transition-all duration-500 w-full max-w-4xl
          ${scrolled 
            ? 'bg-white/95 border border-white/50 shadow-lg shadow-black/[0.03] translate-y-0' 
            : 'bg-white/80 border border-white/40 translate-y-0 shadow-sm'}
        `}>
          
          {/* Actions (Left in Code, Right in RTL) */}
          <div className="flex items-center gap-2">
              {/* Mobile Menu Toggle */}
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden w-10 h-10 rounded-full bg-dark text-white flex items-center justify-center hover:bg-black transition-all active:scale-95 shadow-md z-50 relative"
              >
                  {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              {/* User Profile / Auth Section */}
              {isAuthenticated ? (
                <div className="relative" ref={profileRef}>
                  <button 
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2 sm:gap-3 pl-1 pr-1 sm:pr-4 py-1 bg-white border border-gray-100 rounded-full hover:shadow-md transition-all group cursor-pointer"
                  >
                     <div className="flex flex-col items-end leading-tight px-2">
                        <span className="text-[10px] sm:text-xs font-bold text-dark max-w-[70px] sm:max-w-none truncate">{userName || 'الطالب'}</span>
                        <span className="text-[8px] sm:text-[10px] text-gray-400 font-medium hidden sm:block">مشترك نشط</span>
                     </div>
                     <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-primary to-secondary p-[2px]">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                            <User size={14} className="text-dark sm:w-4 sm:h-4" />
                        </div>
                     </div>
                     <ChevronDown size={14} className={`text-gray-400 transition-transform duration-300 hidden sm:block ${isProfileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Profile Dropdown */}
                  <AnimatePresence>
                    {isProfileOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-full right-0 sm:left-0 mt-3 w-48 sm:w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden p-2 z-50 origin-top-right sm:origin-top-left"
                        >
                             <div className="p-3 bg-gray-50 rounded-xl mb-2 sm:hidden text-center">
                                <span className="block font-bold text-dark text-sm">{userName}</span>
                                <span className="text-xs text-green-500">متصل</span>
                             </div>
                             
                             <button 
                                onClick={onLogoutClick}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors text-xs sm:text-sm font-bold group"
                             >
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                                    <LogOut size={14} />
                                </div>
                                تسجيل الخروج
                             </button>
                        </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button 
                  onClick={onAuthClick}
                  className="flex px-4 sm:px-5 h-10 sm:h-11 rounded-full bg-dark text-white items-center justify-center hover:scale-105 transition-transform shadow-md gap-2 font-bold text-xs sm:text-sm"
                >
                   <LogIn size={14} className="sm:w-4 sm:h-4" />
                   <span>دخول</span>
                </button>
              )}
              
              {/* Search Button - Hidden on mobile to save space */}
              <button className="hidden sm:flex w-11 h-11 rounded-full bg-white text-dark border border-gray-200 items-center justify-center hover:bg-gray-50 transition-colors">
                  <Search size={20} />
              </button>
          </div>

          {/* Links (Center) - Desktop Only */}
          <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
              {['الرئيسية', 'المسارات', 'المجتمع'].map((item, i) => (
                  <button 
                      key={item}
                      onClick={i === 0 ? onHomeClick : undefined}
                      className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                          i === 0 ? 'text-dark bg-white shadow-sm ring-1 ring-gray-100' : 'text-gray-500 hover:text-dark hover:bg-white/50'
                      }`}
                  >
                      {item}
                  </button>
              ))}
          </div>

          {/* Logo (Right in Code, Left in RTL) */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={onHomeClick}>
             <span className="font-bold text-lg tracking-tight text-dark hidden sm:block font-cairo">
               نبض <span className="text-primary">التمريض</span>
             </span>
             <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-tr from-primary to-secondary rounded-full flex items-center justify-center text-white shadow-glow group-hover:rotate-12 transition-transform duration-500 overflow-hidden">
               <img src={logoUrl} alt="logo" className="w-full h-full object-cover" />
             </div>
          </div>

        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/10 z-40 md:hidden"
            />
            
            {/* Menu Content */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed top-24 left-4 right-4 z-50 bg-white/95 rounded-[2rem] shadow-2xl p-4 border border-white/50 ring-1 ring-black/5 md:hidden overflow-hidden"
            >
               <div className="flex flex-col gap-2">
                 {['الرئيسية', 'المسارات', 'المجتمع'].map((item, i) => (
                    <button 
                      key={item}
                      onClick={() => {
                        if (i === 0) onHomeClick();
                        setIsMenuOpen(false);
                      }}
                      className={`w-full text-right px-6 py-4 rounded-2xl text-base font-bold transition-all flex items-center justify-between group ${
                         i === 0 ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'hover:bg-gray-50 text-dark'
                      }`}
                    >
                      {item}
                      {i === 0 && <Sparkles size={16} fill="currentColor" />}
                    </button>
                 ))}
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
