import { ShieldCheck, Gem, Award } from 'lucide-react';
const ITEMS = [{ icon: Gem, text: 'पवित्रतेचे प्रतीक' }, { icon: Award, text: 'शासकीय मान्यताप्राप्त' }, { icon: ShieldCheck, text: '१००% बीआयएस हॉलमार्क प्रमाणित' }];
export const TrustStrip = () => <section className="trust-strip" data-testid="trust-credibility-strip"><div className="section-wrap trust-row">{ITEMS.map(({ icon: Icon, text }, index) => <div className="trust-seal" data-testid={`trust-item-${index + 1}`} key={text}><Icon size={24} strokeWidth={1.2} /><span>{text}</span></div>)}</div></section>;
