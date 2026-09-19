import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import '@/App.css';
import { Toaster } from '@/components/ui/sonner';
import Seo from '@/components/Seo';
import { useLenis } from '@/hooks/useLenis';
import { Ticker } from '@/components/site/Ticker';
import { Navbar } from '@/components/site/Navbar';
import { Hero } from '@/components/site/Hero';
import { Collections } from '@/components/site/Collections';
import { TrustStrip } from '@/components/site/TrustStrip';
import { Heritage } from '@/components/site/Heritage';
import { Footer } from '@/components/site/Footer';
import { BookingModal } from '@/components/site/BookingModal';
import { WhatsAppFloat } from '@/components/site/WhatsAppFloat';
import AdminPage from '@/pages/AdminPage';

function Storefront() {
  useLenis();
  const [bookingOpen, setBookingOpen] = useState(false);
  const openBooking = () => setBookingOpen(true);
  return <div className="storefront" lang="mr"><Seo title="NEW ALANKAR JEWELLERS — पवित्रतेचे प्रतीक" siteName="NEW ALANKAR JEWELLERS" description="शासकीय मान्यताप्राप्त आणि १००% बीआयएस हॉलमार्क प्रमाणित दागिने. आपल्या आवडीचे दागिने पाहा आणि खास भेट ठरवा." image="/crest.png" jsonLd={{ '@context': 'https://schema.org', '@type': 'JewelryStore', name: 'NEW ALANKAR JEWELLERS', slogan: 'पवित्रतेचे प्रतीक', telephone: '+91 9890271037' }} /><Ticker /><Navbar onBook={openBooking} /><main><Hero onBook={openBooking} /><TrustStrip /><Collections /><Heritage /></main><Footer onBook={openBooking} /><BookingModal open={bookingOpen} onOpenChange={setBookingOpen} /><WhatsAppFloat /></div>;
}
function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
export default function App() {
  return <MotionConfig reducedMotion="user"><BrowserRouter><ScrollReset /><Routes><Route path="/admin/*" element={<AdminPage />} /><Route path="*" element={<Storefront />} /></Routes><Toaster theme="light" position="top-center" richColors /></BrowserRouter></MotionConfig>;
}

