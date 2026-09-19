import { useState } from 'react';
import { CalendarDays, Phone, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest, publishChange } from '@/lib/api';
import { indianPhone, waLink } from '@/lib/data';

export const BookingDesk = ({ bookings, reload }) => {
  const [filter, setFilter] = useState('All');
  const [busy, setBusy] = useState('');
  const update = async (booking, status) => {
    setBusy(booking.id);
    try { await apiRequest(`/admin/bookings/${booking.id}`, { method: 'PATCH', body: { status } }); reload(); publishChange('bookings'); toast.success(`Appointment marked ${status.toLowerCase()}`); }
    catch (err) { toast.error(err.message); } finally { setBusy(''); }
  };
  const visible = bookings.filter(b => filter === 'All' || b.status === filter);
  return <section data-testid="admin-bookings-panel"><div className="panel-heading"><div><h2>Appointment inquiries</h2><p>A personal welcome begins with a conversation.</p></div><select className="lux-input compact-select" aria-label="Filter appointment status" data-testid="admin-booking-filter" value={filter} onChange={e => setFilter(e.target.value)}>{['All', 'Pending', 'Confirmed'].map(s => <option key={s}>{s}</option>)}</select></div>
    {!visible.length ? <div className="admin-empty" data-testid="admin-bookings-empty"><CalendarDays size={40} strokeWidth={1} /><h3>No {filter === 'All' ? '' : filter.toLowerCase()} appointments yet</h3><p>Requests from the VIP booking form will appear here automatically.</p></div> : <div className="booking-table-wrap"><table className="booking-table" data-testid="admin-appointments-table"><thead><tr><th>Client / Reference</th><th>Appointment</th><th>Metal preference</th><th>Status</th><th>Contact</th></tr></thead><tbody>{visible.map(b => <tr key={b.id} data-testid={`booking-row-${b.id}`}><td><strong>{b.name}</strong><span>{b.phone}</span><small>{b.reference}</small>{b.note && <p className="booking-note">{b.note}</p>}</td><td>{b.date}<span>{b.time}</span></td><td>{b.metal_interest}</td><td><select className={`status-select ${b.status.toLowerCase()}`} data-testid={`booking-status-${b.id}`} aria-label={`Status for ${b.name}`} value={b.status} disabled={busy === b.id} onChange={e => update(b, e.target.value)}><option>Pending</option><option>Confirmed</option></select></td><td><div className="contact-actions"><a data-testid={`admin-call-appointment-btn-${b.id}`} href={`tel:+${indianPhone(b.phone)}`} className="icon-button" aria-label={`Call ${b.name}`}><Phone size={17} /></a><a data-testid={`admin-whatsapp-appointment-btn-${b.id}`} href={waLink(`नमस्कार ${b.name}, न्यू अलंकार ज्वेलर्सकडून आपल्या भेटीविषयी संपर्क करत आहोत. संदर्भ: ${b.reference}. दिनांक: ${b.date}, वेळ: ${b.time}.`, indianPhone(b.phone))} target="_blank" rel="noopener noreferrer" className="icon-button" aria-label={`WhatsApp ${b.name}`}><MessageCircle size={18} /></a></div></td></tr>)}</tbody></table></div>}
  </section>;
};
