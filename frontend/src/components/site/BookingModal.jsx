import { useEffect, useState } from 'react';
import { CalendarCheck, Loader2, MessageCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { TextField, SelectField } from '@/components/FormFields';
import { METAL_INTERESTS, TIME_SLOTS, waLink, todayIndia } from '@/lib/data';
import { apiRequest, publishChange } from '@/lib/api';

const EMPTY = { name: '', phone: '', date: '', time: '', metal_interest: '' };
export const BookingModal = ({ open, onOpenChange }) => {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (open) { window.__lenis?.stop(); setBooking(null); setForm(EMPTY); setError(''); }
    return () => window.__lenis?.start();
  }, [open]);
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try { const result = await apiRequest('/bookings', { method: 'POST', body: form }); setBooking(result); publishChange('bookings'); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  return <Dialog open={open} onOpenChange={(value) => { if (!loading) onOpenChange(value); }}><DialogContent className="lux-modal booking-modal" data-testid="vip-booking-modal" data-lenis-prevent lang="en"><DialogHeader><span className="modal-icon"><CalendarCheck size={24} strokeWidth={1.2} /></span><p className="english-eyebrow">A MOMENT, JUST FOR YOU</p><DialogTitle className="modal-title">VIP Appointment Booking</DialogTitle><DialogDescription>A personal jewellery consultation, at your convenience.</DialogDescription></DialogHeader>
    {booking ? <div data-testid="booking-success" className="booking-success"><h3>Appointment request received</h3><p>Thank you, {booking.name}. We’ll contact you on {booking.phone} to confirm your visit on {booking.date} at {booking.time}.</p><div className="reference-box"><span>Your reference</span><strong data-testid="booking-reference">{booking.reference}</strong><span data-testid="booking-pending-status">Pending confirmation</span></div><a data-testid="booking-whatsapp-confirm" className="lux-button" href={waLink(`Hello New Alankar Jewellers, I have requested a VIP appointment.\nReference: ${booking.reference}\nName: ${booking.name}\nDate: ${booking.date} at ${booking.time}\nMetal Preference: ${booking.metal_interest}`)} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} /> Continue on WhatsApp</a></div> : <form className="lux-form" onSubmit={submit}>
      <TextField id="booking-name-input" label="Full Name" placeholder="Your full name" value={form.name} onChange={set('name')} required minLength={2} maxLength={80} autoComplete="name" />
      <TextField id="booking-phone-input" label="Phone Number" placeholder="10-digit mobile number" type="tel" value={form.phone} onChange={set('phone')} required autoComplete="tel" />
      <div className="form-two-col"><TextField id="booking-date-input" label="Date" type="date" min={todayIndia()} value={form.date} onChange={set('date')} required /><SelectField id="booking-time-select" label="Time Slot" value={form.time} onChange={set('time')} required options={TIME_SLOTS} placeholder="Select a time" /></div>
      <SelectField id="booking-metal-select" label="Metal Preference" value={form.metal_interest} onChange={set('metal_interest')} required options={METAL_INTERESTS} placeholder="Choose your preferred metal" />
      {error && <p role="alert" className="inline-error" data-testid="booking-error">{error}</p>}
      <button type="submit" disabled={loading} className="lux-button full-width" data-testid="booking-submit-btn">{loading ? <><Loader2 size={18} className="animate-spin" /> Sending your request…</> : <>Request Appointment <CalendarCheck size={17} /></>}</button><p className="form-note">Your details are shared only with our store team. Appointment availability will be confirmed by phone.</p>
    </form>}
  </DialogContent></Dialog>;
};
