import { useCallback, useEffect, useRef, useState } from 'react';
import { Gem, CalendarDays, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { ProductPanel } from './ProductPanel';
import { BookingDesk } from './BookingDesk';

export const AdminWorkspace = () => {
  const [tab, setTab] = useState('products');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  const load = useCallback(async () => {
    try { const [products, bookings] = await Promise.all([apiRequest('/admin/products'), apiRequest('/admin/bookings')]); if (mounted.current) { setData({ products, bookings }); setError(''); } }
    catch (err) { if (mounted.current) setError(err.message); }
  }, []);
  useEffect(() => {
    mounted.current = true; load(); const interval = setInterval(load, 5000);
    const channel = new BroadcastChannel('naj-store'); channel.onmessage = event => { if (event.data !== 'locked') load(); };
    window.addEventListener('focus', load);
    return () => { mounted.current = false; clearInterval(interval); channel.close(); window.removeEventListener('focus', load); };
  }, [load]);
  return <main className="section-wrap admin-main"><div className="admin-welcome"><div><p className="english-eyebrow">YOUR STORE, BEAUTIFULLY MANAGED</p><h1>Welcome back, Owner.</h1><p>Curate your jewellery. Connect with your clients.</p></div><span className="private-badge"><CheckCircle2 size={14} /> Secure owner session</span></div>
    {error && <div role="alert" className="inline-error" data-testid="admin-data-error">{error}<button className="text-button" data-testid="admin-data-retry" onClick={load}><RefreshCw size={14} /> Retry</button></div>}
    {!data ? <div className="admin-empty" data-testid="admin-data-loading"><Loader2 className="animate-spin" /><p>Loading your store…</p></div> : <><div className="admin-stats"><div data-testid="admin-total-products"><Gem size={22} strokeWidth={1.3} /><span>Jewellery Pieces<strong>{data.products.length}</strong></span></div><div data-testid="admin-active-products"><CheckCircle2 size={22} strokeWidth={1.3} /><span>Visible in Store<strong>{data.products.filter(p => p.active).length}</strong></span></div><div data-testid="admin-pending-bookings"><CalendarDays size={22} strokeWidth={1.3} /><span>Pending Appointments<strong>{data.bookings.filter(b => b.status === 'Pending').length}</strong></span></div></div>
      <div className="admin-tabs"><button data-testid="admin-products-tab" aria-pressed={tab === 'products'} className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}><Gem size={17} /> Jewellery Collection</button><button data-testid="admin-bookings-tab" aria-pressed={tab === 'bookings'} className={tab === 'bookings' ? 'active' : ''} onClick={() => setTab('bookings')}><CalendarDays size={17} /> Appointment Inquiries <span>{data.bookings.length}</span></button></div>
      {tab === 'products' ? <ProductPanel products={data.products} reload={load} /> : <BookingDesk bookings={data.bookings} reload={load} />}
    </>}
  </main>;
};
