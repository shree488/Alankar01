import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, ArrowDown, ShieldCheck } from 'lucide-react';
import { scrollToId } from '@/hooks/useLenis';



export const Hero = ({ onBook }) => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 900], [0, 65]);
  const reduced = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const IMAGES = [1, 2, 3];
  const AUTOPLAY_DELAY = 2200;
  const TRANSITION_DUR = 700;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev === IMAGES.length - 1 ? 0 : prev + 1));
  }, [IMAGES.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? IMAGES.length - 1 : prev - 1));
  }, [IMAGES.length]);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(nextSlide, AUTOPLAY_DELAY);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide, currentIndex]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) nextSlide();
    else if (diff < -50) prevSlide();
  };

  return <section id="home" data-testid="hero-section" className="hero section-wrap">
    <div className="hero-copy">
      <div 
        className="w-full relative mb-6 overflow-hidden rounded-2xl shadow-md border border-stone-200 bg-white cursor-pointer"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={nextSlide}
      >
        <div 
          className="flex w-full transition-transform ease-out" 
          style={{ 
            transform: `translateX(-${currentIndex * 100}%)`,
            transitionDuration: `${TRANSITION_DUR}ms` 
          }}
        >
          {IMAGES.map((num) => (
            <div key={num} className="w-full flex-shrink-0 group">
              <div className={`w-full h-[350px] md:h-[450px] overflow-hidden flex items-center justify-center ${num === 1 ? 'bg-stone-50' : ''}`}>
                <img 
                  src={`/hero-jewel-${num}.jpg`} 
                  alt={`Premium Jewellery Collection ${num}`} 
                  className={`w-full h-full transition-transform duration-700 ease-out group-hover:scale-125 ${num === 1 ? 'object-contain p-4' : 'object-cover'}`}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
          {IMAGES.map((_, idx) => (
            <button 
              key={idx} 
              aria-label={`Go to slide ${idx + 1}`}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              className={`h-2 rounded-full transition-all duration-500 hover:bg-[#c5a880] focus:outline-none ${idx === currentIndex ? 'w-6 bg-[#c5a880]' : 'w-2 bg-stone-300'}`} 
            />
          ))}
        </div>
      </div>
      <p className="hero-description" data-testid="hero-description">आयुष्यातील खास क्षणांना द्या शुद्धतेची आणि सौंदर्याची साथ. आपल्या आवडीनुसार दागिने निवडा, विश्वासाने.</p>
      <div className="hero-actions"><button className="lux-button" data-testid="hero-cta-explore" onClick={() => scrollToId('#collections')}>दागिने पाहा <ArrowUpRight size={18} /></button><button className="text-button" data-testid="hero-booking-btn" onClick={onBook}>खास भेट ठरवा <span className="thin-arrow">⟶</span></button></div>
      <div className="hero-certification" data-testid="hero-certification"><ShieldCheck size={25} strokeWidth={1.3} /><p>शासकीय मान्यताप्राप्त<br /><strong>१००% बीआयएस हॉलमार्क प्रमाणित दागिने</strong></p></div>
    </div>
    <motion.div className="hero-art hero-portrait" style={reduced ? {} : { y }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.4 }}>
      <div className="arch-frame">
        <picture className="hero-portrait-background"><source media="(max-width: 540px)" srcSet="/traditional-portrait-mobile.webp" /><img src="/traditional-portrait.webp" alt="पारंपरिक साडी आणि दागिन्यांनी सजलेली महिला" data-testid="hero-traditional-portrait" width="1200" height="1799" fetchPriority="high" /></picture>
        <div className="hero-portrait-scrim" aria-hidden="true" />
        <div className="arch-inner"><img className="hero-crest" src="/crest.png" alt="न्यू अलंकार ज्वेलर्सचे राजचिन्ह" /><div className="hero-portrait-signature"><p className="crest-wordmark">NEW ALANKAR<br /><span>JEWELLERS</span></p><p className="arch-tagline" data-testid="hero-tagline">Symbol Of Purity</p></div></div>
      </div>
      <div className="art-caption" data-testid="hero-art-caption"><span>शुद्धता</span><span>परंपरा</span><span>विश्वास</span></div>
    </motion.div>
    <button className="hero-scroll" data-testid="hero-scroll-indicator" onClick={() => scrollToId('#collections')}><ArrowDown size={15} /> आमचा संग्रह पाहा</button>
  </section>;
};
