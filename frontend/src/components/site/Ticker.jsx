import { ShieldCheck, Phone } from 'lucide-react';
import { PHONE_DISPLAY } from '@/lib/data';
export const Ticker = () => <div className="announcement" data-testid="announcement-ticker-bar"><div className="section-wrap announcement-row"><p data-testid="announcement-trust"><ShieldCheck size={14} /> शासकीय मान्यताप्राप्त आणि १००% बीआयएस हॉलमार्क प्रमाणित दागिने</p><a data-testid="announcement-phone" href="tel:+919890271037"><Phone size={13} /> {PHONE_DISPLAY}</a></div></div>;
