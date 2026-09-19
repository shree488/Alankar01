import { MapPin, Navigation, Phone, ArrowUpRight } from 'lucide-react';
import { PHONE_DISPLAY } from '@/lib/data';

export const ShowroomMap = () => <section className="showroom-section" data-testid="showroom-map-section" aria-labelledby="showroom-map-heading">
  <div className="showroom-info">
    <p className="eyebrow">०४ / आमचे दालन</p>
    <h2 id="showroom-map-heading" data-testid="showroom-map-heading">आपल्या भेटीची वाट पाहत आहोत.</h2>
    <p className="showroom-brand" data-testid="showroom-map-brand">NEW ALANKAR JEWELLERS</p>
    <address data-testid="showroom-address"><MapPin size={20} strokeWidth={1.4} /><span>कासार गल्ली, सोमवार पेठ,<br />तासगाव, महाराष्ट्र ४१६३१२</span></address>
    <p className="showroom-visit-note" data-testid="showroom-visit-note">भेट देण्यापूर्वी फोन करून वेळ निश्चित करा.</p>
    <a className="showroom-phone" data-testid="showroom-phone-link" href="tel:+919890271037"><Phone size={16} strokeWidth={1.5} /> {PHONE_DISPLAY}</a>
    <a className="lux-button showroom-directions" data-testid="showroom-directions-link" href={process.env.REACT_APP_SHOWROOM_DIRECTIONS_URL} target="_blank" rel="noopener noreferrer"><Navigation size={16} /> येण्याचा मार्ग पाहा</a>
    <a className="text-button showroom-google-link" data-testid="showroom-google-link" href={process.env.REACT_APP_SHOWROOM_MAP_URL} target="_blank" rel="noopener noreferrer">Google Maps वर पाहा <ArrowUpRight size={15} /></a>
  </div>
  <div className="showroom-map-frame" data-lenis-prevent>
    <iframe data-testid="showroom-map-iframe" title="न्यू अलंकार ज्वेलर्स, तासगाव — Google Maps नकाशा" src={process.env.REACT_APP_SHOWROOM_MAP_EMBED_URL} width="100%" height="380" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
  </div>
</section>;
