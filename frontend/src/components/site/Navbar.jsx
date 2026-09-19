import { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, X, ArrowUpRight, Search, Camera, Gem, Store, Heart, UserRound, X as CloseIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { scrollToId } from '@/hooks/useLenis';
import { CATEGORIES, API } from '@/lib/data';
import { apiRequest } from '@/lib/api';

const LINKS = [
  { label: 'दागिने संग्रह', hash: '#collections', id: 'collections' },
  { label: 'परंपरा', hash: '#heritage', id: 'heritage' },
  { label: 'संपर्क', hash: '#contact', id: 'contact' }
];

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const containerRef = useRef();
  const fileInputRef = useRef();

  const handleSearch = (e) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('naj-search', { detail: query }));
    const collections = document.getElementById('collections');
    if (collections) collections.scrollIntoView({ behavior: 'smooth' });
    setFocused(false);
    document.activeElement?.blur();
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setFocused(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      setFocused(false);
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const suggestions = query ? CATEGORIES.filter(c => c.label.includes(query) || (c.english && c.english.toLowerCase().includes(query.toLowerCase()))).slice(0, 5) : CATEGORIES.slice(1, 6);

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={handleSearch} className={`flex items-center w-full h-11 bg-white border rounded-full px-4 transition-colors ${focused ? 'border-[#D4AF37] shadow-[0_0_0_1px_#D4AF37]' : 'border-[#3B1254]'}`}>
        <Search size={18} className="text-[#3B1254] flex-shrink-0" />
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="दागिने शोधा... (उदा. अंगठी, नेकलेस, मंगळसूत्र)"
          className="flex-1 bg-transparent border-none outline-none px-3 text-sm text-[#3B1254] placeholder:text-stone-400 min-w-0"
          aria-label="दागिने शोधा"
        />
        <div className="flex items-center flex-shrink-0 pl-1">
          <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className={`transition-colors flex items-center justify-center w-8 h-8 rounded-full ${imagePreview ? 'text-[#D4AF37] bg-stone-50' : 'text-[#3B1254] hover:text-[#D4AF37] hover:bg-stone-50'}`} title="Search by image" aria-label="Image Search">
            <Camera size={18} strokeWidth={2} />
          </button>
        </div>
      </form>
      
      {focused && !imagePreview && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-stone-200 rounded-xl shadow-xl py-2 z-50 overflow-hidden">
          <p className="px-4 py-1 text-xs font-semibold text-stone-400 uppercase tracking-wider">Suggestions</p>
          {suggestions.map(s => (
            <button 
              key={s.id}
              type="button"
              className="w-full text-left px-4 py-2 text-sm text-[#3B1254] hover:bg-stone-50 hover:text-[#D4AF37] transition-colors"
              onClick={() => { setQuery(s.label); window.dispatchEvent(new CustomEvent('naj-search', { detail: s.id === 'all' ? '' : s.label })); setFocused(false); document.getElementById('collections')?.scrollIntoView({ behavior: 'smooth' }); }}
            >
              <Search size={14} className="inline mr-2 text-stone-400" />
              {s.label}
            </button>
          ))}
          {suggestions.length === 0 && (
            <p className="px-4 py-3 text-sm text-stone-500">No matching categories. Try searching for specific items.</p>
          )}
        </div>
      )}

      {imagePreview && (
        <div className="absolute top-full right-0 mt-2 p-3 bg-white border border-stone-200 rounded-xl shadow-lg z-50 flex items-start gap-3 w-[260px] animate-in fade-in zoom-in duration-200">
          <img src={imagePreview} alt="Selected for search" className="w-14 h-14 object-cover rounded-md border border-stone-100 flex-shrink-0" />
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-sm text-[#3B1254] font-medium leading-tight mb-1">Image selected</p>
            <p className="text-xs text-stone-500 leading-tight">Image search is being prepared...</p>
          </div>
          <button type="button" onClick={clearImage} className="text-stone-400 hover:text-[#3B1254] flex-shrink-0 p-1 -mr-1 -mt-1" aria-label="Remove image">
            <CloseIcon size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

const PurityModal = ({ onClose }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleEsc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleEsc);
    return () => { document.body.style.overflow = 'auto'; window.removeEventListener('keydown', handleEsc); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#faf9fb] rounded-2xl shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-[#3B1254] transition-colors" aria-label="Close">
          <CloseIcon size={20} />
        </button>
        <div className="w-12 h-12 rounded-full bg-[#3B1254]/5 flex items-center justify-center mb-5 mx-auto">
          <Gem className="text-[#D4AF37]" size={24} />
        </div>
        <h2 className="text-2xl font-serif text-center text-[#3B1254] mb-2">Hallmark & Purity</h2>
        <div className="w-10 h-[1px] bg-[#D4AF37] mx-auto mb-6" />
        <div className="space-y-4 text-sm text-stone-600">
          <p>At <strong>NEW ALANKAR JEWELLERS</strong>, we believe purity is the foundation of trust. Every piece of jewellery we craft is rigorously tested and certified.</p>
          <ul className="space-y-3 mt-4">
            <li className="flex items-start gap-2">
              <span className="text-[#D4AF37] font-bold mt-0.5">•</span>
              <span><strong>BIS Hallmark:</strong> 100% of our gold jewellery is BIS Hallmarked, ensuring authentic purity.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#D4AF37] font-bold mt-0.5">•</span>
              <span><strong>22K & 24K Gold:</strong> We offer premium 22 Karat (91.6%) and pure 24 Karat (99.9%) gold variants.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#D4AF37] font-bold mt-0.5">•</span>
              <span><strong>Certified Diamonds:</strong> Our diamonds are graded by top international laboratories for cut, color, clarity, and carat.</span>
            </li>
          </ul>
          <p className="mt-4 pt-4 border-t border-stone-200 text-center text-xs text-stone-500">
            For further validation, our showroom provides live purity checking via XRF Gold Testing machines.
          </p>
        </div>
      </div>
    </div>
  );
};

const AuthModal = ({ onClose }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleEsc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleEsc);
    return () => { document.body.style.overflow = 'auto'; window.removeEventListener('keydown', handleEsc); };
  }, [onClose]);

  const handleGoogle = () => {
    window.location.href = `${API}/auth/google/login`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-[400px] bg-white rounded-[24px] shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-5 right-5 text-stone-400 hover:text-[#3B1254] transition-colors" aria-label="Close">
          <CloseIcon size={20} />
        </button>
        
        <div className="text-center mb-8">
          <img src="/crest.png" alt="New Alankar Jewellers" className="h-14 mx-auto mb-3" />
          <h2 className="text-sm font-serif font-bold tracking-widest text-[#3B1254]">NEW ALANKAR JEWELLERS</h2>
          <p className="text-[#D4AF37] text-xs font-medium tracking-widest mt-1">पवित्रतेचे प्रतीक</p>
        </div>

        <h3 className="text-xl font-medium text-center text-[#3B1254] mb-8">लॉगिन करा किंवा साइन अप करा</h3>

        <button onClick={handleGoogle} className="w-full flex items-center justify-center gap-3 bg-white border border-stone-200 text-stone-700 font-medium py-3.5 px-4 rounded-xl hover:bg-stone-50 hover:shadow-sm transition-all">
          <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </button>

        <div className="mt-8 text-center border-t border-stone-100 pt-5">
          <Link to="/admin" onClick={onClose} className="text-[11px] uppercase tracking-wider text-stone-400 hover:text-[#D4AF37] font-medium transition-colors">
            Admin / Owner Portal
          </Link>
        </div>
      </div>
    </div>
  );
};

export const Navbar = ({ onBook }) => {
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [purityOpen, setPurityOpen] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [user, setUser] = useState(null); 
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  const go = (hash) => { setOpen(false); scrollToId(hash); };

  const updateWishlistCount = useCallback(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('naj_wishlist') || '[]');
      setWishlistCount(saved.length);
    } catch { setWishlistCount(0); }
  }, []);

  useEffect(() => {
    updateWishlistCount();
    window.addEventListener('naj-wishlist-change', updateWishlistCount);

    const checkAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('google_auth_success') === '1') {
        try {
          const userObj = await apiRequest('/auth/me/customer');
          setUser(userObj);
          localStorage.setItem('naj_customer_session', JSON.stringify(userObj));
        } catch (e) {
          console.error('Failed to fetch profile after google auth', e);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (urlParams.get('error')) {
        const errorMsg = urlParams.get('error');
        if (errorMsg === 'google_not_configured') {
           alert('Google OAuth requires backend configuration (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET).');
        } else {
           alert('Google login could not be completed. Please try again.');
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        const storedUser = localStorage.getItem('naj_customer_session');
        if (storedUser) setUser(JSON.parse(storedUser));
      }
    };
    
    checkAuth();

    return () => window.removeEventListener('naj-wishlist-change', updateWishlistCount);
  }, [updateWishlistCount]);

  const handleLogout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch(e) {
      // Ignore errors on logout
    }
    setUser(null);
    localStorage.removeItem('naj_customer_session');
    setUserMenuOpen(false);
  };

  return (
    <>
      <header data-testid="glassmorphic-navbar" className="site-header">
        <div className="section-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          
          {/* Top Row: Brand, Search, Utilities */}
          <div className="flex items-center justify-between w-full min-h-[80px] gap-4 md:gap-6">
            <button data-testid="nav-brand" className="brand flex-shrink-0" onClick={() => go('#home')}>
              <img src="/crest.png" alt="New Alankar Jewellers crest" />
              <span className="hidden sm:block">
                <strong>NEW ALANKAR JEWELLERS</strong>
                <small className="navbar-tagline">Symbol of Purity</small>
              </span>
            </button>
            
            <div className="flex-1 hidden md:block">
              <SearchBar />
            </div>

            <div className="flex items-center gap-4 md:gap-5 flex-shrink-0">
              <button onClick={() => setPurityOpen(true)} className="text-[#3B1254] hover:text-[#D4AF37] transition-colors" aria-label="Hallmark and Purity" title="Hallmark & Purity">
                <Gem size={22} strokeWidth={1.5} />
              </button>
              
              <button onClick={() => go('#contact')} className="text-[#3B1254] hover:text-[#D4AF37] transition-colors" aria-label="Store Locator" title="Store Locator">
                <Store size={22} strokeWidth={1.5} />
              </button>
              
              <button onClick={() => go('#collections')} className="relative text-[#3B1254] hover:text-[#D4AF37] transition-colors" aria-label="Wishlist" title="Wishlist">
                <Heart size={22} strokeWidth={1.5} />
                {wishlistCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#3B1254] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-medium">
                    {wishlistCount}
                  </span>
                )}
              </button>

              <div className="relative">
                <button onClick={() => user ? setUserMenuOpen(!userMenuOpen) : setAuthOpen(true)} className="text-[#3B1254] hover:text-[#D4AF37] transition-colors" aria-label="Account" title="Account">
                  <UserRound size={22} strokeWidth={1.5} />
                </button>
                
                {user && userMenuOpen && (
                  <div className="absolute right-0 mt-4 w-56 bg-white border border-stone-200 shadow-xl rounded-xl py-2 z-50">
                    <div className="px-4 py-3 border-b border-stone-100 mb-1">
                      <p className="text-sm font-semibold text-[#3B1254] truncate">{user.name}</p>
                      <p className="text-xs text-stone-500 mt-0.5 truncate">+91 {user.phone}</p>
                    </div>
                    <button onClick={() => { setUserMenuOpen(false); onBook(); }} className="w-full text-left px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 hover:text-[#D4AF37]">
                      My Orders/Appointments
                    </button>
                    <button onClick={() => { setUserMenuOpen(false); go('#collections'); }} className="w-full text-left px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 hover:text-[#D4AF37]">
                      Saved Wishlist
                    </button>
                    <div className="border-t border-stone-100 mt-1 pt-1">
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 hover:text-red-600">
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button className="icon-button mobile-toggle md:hidden ml-1" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'}>
                {open ? <X size={24} className="text-[#3B1254]" /> : <Menu size={24} className="text-[#3B1254]" />}
              </button>
            </div>
          </div>

          {/* Search Bar on Mobile */}
          <div className="w-full block md:hidden pb-4">
            <SearchBar />
          </div>

          {/* Desktop Navigation Links (retained to not break existing architecture) */}
          <nav className="desktop-nav w-full justify-center hidden md:flex border-t border-stone-100 py-3" aria-label="Main navigation" style={{ margin: 0 }}>
            {LINKS.map((link) => <button key={link.id} onClick={() => go(link.hash)} className="text-stone-600 hover:text-[#3B1254] font-medium tracking-wide uppercase text-xs mx-6 transition-colors">{link.label}</button>)}
            <button onClick={onBook} className="text-[#D4AF37] hover:text-[#3B1254] font-medium tracking-wide uppercase text-xs mx-6 transition-colors flex items-center gap-1">
              बुक अपॉइंटमेंट <ArrowUpRight size={14} />
            </button>
          </nav>
        </div>

        {/* Mobile Nav Links */}
        {open && (
          <nav className="mobile-nav flex flex-col p-4 bg-white border-t border-stone-100">
            {LINKS.map((link) => <button key={link.id} className="py-4 text-left border-b border-stone-100 text-[#3B1254] font-medium" onClick={() => go(link.hash)}>{link.label}</button>)}
            <button className="lux-button mt-5" onClick={() => { setOpen(false); onBook(); }}>
              बुक अपॉइंटमेंट <ArrowUpRight size={16} className="ml-2" />
            </button>
          </nav>
        )}
      </header>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      {purityOpen && <PurityModal onClose={() => setPurityOpen(false)} />}
    </>
  );
};
