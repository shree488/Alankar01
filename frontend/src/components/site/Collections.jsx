import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Gem, MessageCircle, ArrowUpRight, Loader2 } from 'lucide-react';
import { CATEGORIES, METAL_LABELS, waLink, DEFAULT_WA_MESSAGE } from '@/lib/data';
import { apiRequest } from '@/lib/api';
import { Reveal } from './Reveal';
import { ProductImage } from './ProductImage';

const ProductCard = ({ product: p }) => <motion.article layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="product-card" data-testid={`product-card-${p.id}`}>
  <div className="product-photo"><ProductImage url={p.image_url} title={p.title} testId={`product-image-${p.id}`} /><span className="purity-badge" data-testid={`product-metal-${p.id}`}>{METAL_LABELS[p.metal]}</span></div>
  <div className="product-copy"><p className="product-category" data-testid={`product-section-${p.id}`}>{CATEGORIES.find(c => c.id === p.section)?.label}</p><h3 data-testid={`product-title-${p.id}`}>{p.title}</h3><p className="product-description" data-testid={`product-description-${p.id}`}>{p.description}</p><p className="product-weight" data-testid={`product-weight-${p.id}`}>अंदाजे वजन: {p.weight.toLocaleString('mr-IN')} ग्रॅम</p>
    <a className="product-inquire" data-testid={`product-whatsapp-btn-${p.id}`} href={waLink(`${DEFAULT_WA_MESSAGE}\nदागिना: ${p.title}\nधातू: ${METAL_LABELS[p.metal]}\nवजन: ${p.weight} ग्रॅम`)} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} /> व्हॉट्सॲपवर चौकशी करा <ArrowUpRight size={17} /></a>
  </div>
</motion.article>;

export const Collections = () => {
  const [active, setActive] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    try { const data = await apiRequest('/products'); setProducts(data); setError(false); }
    catch { setError(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    const channel = new BroadcastChannel('naj-store'); channel.onmessage = load;
    
    const handleSearch = (e) => {
      setSearchQuery(e.detail.toLowerCase());
      if (e.detail) setActive('all'); // Reset category filter when searching
    };

    window.addEventListener('focus', load); 
    window.addEventListener('naj-store-change', load);
    window.addEventListener('naj-search', handleSearch);
    
    return () => { 
      clearInterval(interval); 
      channel.close(); 
      window.removeEventListener('focus', load); 
      window.removeEventListener('naj-store-change', load); 
      window.removeEventListener('naj-search', handleSearch);
    };
  }, [load]);

  const visible = products.filter(p => {
    const matchesCategory = active === 'all' || p.section === active;
    const matchesSearch = !searchQuery || 
      p.title.toLowerCase().includes(searchQuery) || 
      (p.description && p.description.toLowerCase().includes(searchQuery)) ||
      CATEGORIES.find(c => c.id === p.section)?.label.includes(searchQuery) ||
      CATEGORIES.find(c => c.id === p.section)?.english.toLowerCase().includes(searchQuery);
    return matchesCategory && matchesSearch;
  });
  return <section id="collections" className="collections section-space" data-testid="collections-showcase-gallery"><div className="section-wrap">
    <Reveal><div className="section-heading"><div><p className="eyebrow">०१ / आमचा संग्रह</p><h2 data-testid="collections-heading">आपल्या प्रत्येक क्षणासाठी, खास अलंकार.</h2></div><p>परंपरेपासून आधुनिकतेपर्यंत —<br />आपल्या मनाला भावणारी निवड.</p></div></Reveal>
    <div className="category-tabs" data-testid="collections-tabs" aria-label="दागिन्यांचा प्रकार">{CATEGORIES.map(c => <button key={c.id} data-testid={`filter-tab-${c.id}`} aria-pressed={active === c.id} className={active === c.id ? 'active' : ''} onClick={() => setActive(c.id)}>{c.label}</button>)}</div>
    {error && <div role="alert" className="inline-error" data-testid="catalog-error">संग्रह लोड करता आला नाही. <button data-testid="catalog-retry" onClick={load}>पुन्हा प्रयत्न करा</button></div>}
    {loading ? <div className="catalog-empty" data-testid="catalog-loading" role="status"><Loader2 className="animate-spin" /><p>संग्रह लोड होत आहे…</p></div> : !error && !visible.length ? <div className="catalog-empty" data-testid="catalog-empty-state"><div className="empty-gem"><Gem size={35} strokeWidth={1} /></div><h3>लवकरच नवीन दागिने उपलब्ध होतील.</h3><p>आपल्या आवडत्या दागिन्यांविषयी जाणून घेण्यासाठी आमच्याशी संपर्क साधा.</p><a className="text-button" data-testid="empty-catalog-inquiry" href={waLink()} target="_blank" rel="noopener noreferrer">व्हॉट्सॲपवर संपर्क साधा <ArrowUpRight size={17} /></a></div> : <div className="product-grid">{visible.map(p => <ProductCard key={p.id} product={p} />)}</div>}
  </div></section>;
};
