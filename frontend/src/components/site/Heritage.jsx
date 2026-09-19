import { Sparkle } from 'lucide-react';
import { Marquee } from './Marquee';
import { Reveal } from './Reveal';
const CHAPTERS = [
  { numeral: '०१', title: 'शुद्धतेशी बांधिलकी', text: 'शासकीय मान्यताप्राप्त आणि बीआयएस हॉलमार्क प्रमाणित दागिने. प्रत्येक निवडीमागे शुद्धतेचा विश्वास.' },
  { numeral: '०२', title: 'परंपरेचा साज', text: 'सण, समारंभ आणि आयुष्यातील अनमोल क्षणांसाठी दागिन्यांची निवड. आपल्या संस्कृतीशी जुळणारे सौंदर्य.' },
  { numeral: '०३', title: 'आपुलकीचा संवाद', text: 'आपल्या आवडीनिवडी समजून घेण्यासाठी वैयक्तिक भेट. दागिन्यांविषयीच्या प्रत्येक प्रश्नाचे सविस्तर मार्गदर्शन.' },
];
export const Heritage = () => <section id="heritage" data-testid="heritage-manifesto-chapters" className="heritage section-space">
  <div className="section-wrap heritage-layout"><Reveal><p className="eyebrow">०२ / आमची मूल्ये</p><h2 data-testid="heritage-heading">दागिना केवळ अलंकार नाही,<br />तो आठवणींचा ठेवा आहे.</h2><p className="heritage-intro">NEW ALANKAR JEWELLERS</p><p className="heritage-tagline">पवित्रतेचे प्रतीक.</p><div className="heritage-emblem" aria-hidden="true"><Sparkle size={76} strokeWidth={0.5} /></div></Reveal><div>{CHAPTERS.map((c, index) => <Reveal key={c.numeral} delay={index * 0.1}><article className="chapter" data-testid={`chapter-${index + 1}`}><span>{c.numeral}</span><div><h3>{c.title}</h3><p>{c.text}</p></div></article></Reveal>)}</div></div>
  <div className="editorial-marquee" data-testid="editorial-marquee"><Marquee duration={60}><span>शुद्धतेचा विश्वास <Sparkle size={28} /> परंपरेचे सौंदर्य <Sparkle size={28} /> अनमोल नाती <Sparkle size={28} /></span></Marquee></div>
</section>;
