import { Phone, LockKeyhole, ArrowUpRight, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { waLink, PHONE_DISPLAY } from '@/lib/data';
import { ShowroomMap } from './ShowroomMap';
export const Footer = ({ onBook }) => <footer id="contact" data-testid="royal-footer" className="site-footer"><div className="section-wrap">
  <div className="appointment-callout"><div><p className="eyebrow">०३ / आपली खास भेट</p><h2 data-testid="footer-invitation">आपली आवड. आमचे मार्गदर्शन.</h2><p>निवांतपणे दागिने पाहण्यासाठी आणि सविस्तर माहिती घेण्यासाठी भेट ठरवा.</p></div><button className="lux-button" data-testid="footer-book-viewing-btn" onClick={onBook}>खास भेट ठरवा <ArrowUpRight size={19} /></button></div>
  <div className="footer-grid"><div><div className="brand footer-brand"><img src="/crest.png" alt="न्यू अलंकार ज्वेलर्सचे राजचिन्ह" /><span><strong>NEW ALANKAR JEWELLERS</strong><small>पवित्रतेचे प्रतीक</small></span></div><p className="footer-note" data-testid="footer-trust">शासकीय मान्यताप्राप्त आणि १००% बीआयएस हॉलमार्क प्रमाणित दागिने</p></div><div><h3>आमच्याशी संपर्क साधा</h3><a data-testid="footer-phone-link" href="tel:+919890271037"><Phone size={16} /> {PHONE_DISPLAY}</a><a data-testid="footer-whatsapp-link" href={waLink()} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} /> व्हॉट्सॲपवर संवाद साधा</a></div><div><h3>दागिन्यांच्या पलीकडे</h3><a data-testid="footer-collection-link" href="#collections">आमचा संग्रह <ArrowUpRight size={15} /></a><a data-testid="footer-heritage-link" href="#heritage">आमची मूल्ये <ArrowUpRight size={15} /></a></div></div>
  <ShowroomMap />
  <div className="footer-bottom"><p>© {new Date().getFullYear()} NEW ALANKAR JEWELLERS. All rights reserved.</p><Link data-testid="footer-owner-login-link" className="owner-link" to="/admin"><LockKeyhole size={13} /> मालक प्रवेश</Link></div>
</div></footer>;
