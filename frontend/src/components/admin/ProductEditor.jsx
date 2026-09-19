import { useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { TextField, SelectField } from '@/components/FormFields';
import { CATEGORIES, METAL_INTERESTS } from '@/lib/data';
import { apiRequest, publishChange } from '@/lib/api';
import { ImageUpload } from './ImageUpload';

const EMPTY = { title: '', section: 'ring', metal: 'Gold 22K', weight: '', image_url: '', description: '', active: true };
export const ProductEditor = ({ product, onClose, onSaved }) => {
  const [form, setForm] = useState(product ? Object.fromEntries(Object.keys(EMPTY).map(key => [key, product[key]])) : EMPTY);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const busy = uploading || saving;
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));
  const submit = async e => {
    e.preventDefault(); if (busy) return;
    if (!form.image_url.trim()) { setError('Upload a jewellery photo or enter its direct image URL.'); return; }
    setSaving(true); setError('');
    try {
      await apiRequest(product ? `/admin/products/${product.id}` : '/admin/products', { method: product ? 'PUT' : 'POST', body: { ...form, weight: Number(form.weight) } });
      publishChange(); toast.success(product ? 'Jewellery updated' : 'Jewellery added to your catalog'); onSaved(); onClose();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent className="lux-modal product-editor" data-testid="admin-product-modal" data-lenis-prevent lang="en"><DialogHeader><p className="english-eyebrow">YOUR COLLECTION</p><DialogTitle className="modal-title">{product ? 'Edit Jewellery' : 'Add New Jewellery'}</DialogTitle><DialogDescription>Only your own products appear in the public catalog.</DialogDescription></DialogHeader>
    <form className="editor-grid" onSubmit={submit}><div><ImageUpload value={form.image_url} onChange={value => setForm(f => ({ ...f, image_url: value }))} busy={busy} setBusy={setUploading} /></div><div className="lux-form">
      <TextField id="admin-product-title-input" label="Title" placeholder="Enter the jewellery name" value={form.title} onChange={set('title')} required minLength={2} maxLength={120} disabled={busy} />
      <SelectField id="admin-product-category-select" label="Ornaments Type / Section" options={CATEGORIES.filter(c => c.id !== 'all').map(c => ({ value: c.id, label: `${c.label} (${c.english})` }))} value={form.section} onChange={set('section')} disabled={busy} />
      <div className="form-two-col"><SelectField id="admin-product-metal-select" label="Metal Type" options={METAL_INTERESTS} value={form.metal} onChange={set('metal')} disabled={busy} /><TextField id="admin-product-weight-input" label="Weight (grams)" type="number" min="0.001" max="100000" step="0.001" value={form.weight} onChange={set('weight')} required disabled={busy} /></div>
      <TextField id="admin-product-description-input" label="Description" placeholder="Craft, details, and what makes this piece special…" multiline value={form.description} onChange={set('description')} maxLength={2000} disabled={busy} />
      <p className="form-note">Use Marathi titles and descriptions for a consistent storefront.</p>
      <label className="status-check" htmlFor="admin-product-active-input"><input type="checkbox" id="admin-product-active-input" data-testid="admin-product-active-input" checked={form.active} disabled={busy} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} /><span><strong>Active Status</strong><small>Visible in the public collection when active</small></span></label>
      {error && <p className="inline-error" data-testid="admin-product-error" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="outline-button" data-testid="admin-product-cancel" onClick={onClose} disabled={busy}>Cancel</button><button className="lux-button" type="submit" data-testid="admin-product-submit-btn" disabled={busy}>{busy ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}{uploading ? 'Uploading photo…' : saving ? 'Saving…' : 'Save Jewellery'}</button></div>
    </div></form>
  </DialogContent></Dialog>;
};
