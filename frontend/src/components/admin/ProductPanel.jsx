import { useState } from 'react';
import { Plus, Pencil, Trash2, Gem, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CATEGORIES } from '@/lib/data';
import { apiRequest, publishChange } from '@/lib/api';
import { ProductImage } from '@/components/site/ProductImage';
import { ProductEditor } from './ProductEditor';

export const ProductPanel = ({ products, reload }) => {
  const [editor, setEditor] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState('');
  const toggle = async p => {
    setBusy(p.id);
    const { title, section, metal, weight, image_url, description } = p;
    try { await apiRequest(`/admin/products/${p.id}`, { method: 'PUT', body: { title, section, metal, weight, image_url, description, active: !p.active } }); publishChange(); reload(); toast.success(p.active ? 'Product hidden from storefront' : 'Product is now visible'); }
    catch (err) { toast.error(err.message); } finally { setBusy(''); }
  };
  const remove = async () => {
    setBusy(deleting.id);
    try { await apiRequest(`/admin/products/${deleting.id}`, { method: 'DELETE' }); publishChange(); reload(); setDeleting(null); toast.success('Jewellery deleted'); }
    catch (err) { toast.error(err.message); } finally { setBusy(''); }
  };
  return <section data-testid="admin-products-panel"><div className="panel-heading"><div><h2>Your jewellery collection</h2><p>Add your real pieces. Changes appear automatically in the store.</p></div><button className="lux-button" data-testid="admin-add-product-btn" onClick={() => setEditor({})}><Plus size={18} /> Add New Jewellery</button></div>
    {!products.length ? <div className="admin-empty" data-testid="admin-products-empty"><Gem size={42} strokeWidth={1} /><h3>Your collection starts here</h3><p>No sample products. Add your first piece to bring your storefront to life.</p><button className="outline-button" data-testid="admin-add-first-product" onClick={() => setEditor({})}><Plus size={16} /> Add your first jewellery</button></div> : <div className="admin-product-grid">{products.map(p => <article className="admin-product-card" key={p.id} data-testid={`admin-product-${p.id}`}><div className="admin-product-photo"><ProductImage url={p.image_url} title={p.title} testId={`admin-product-image-${p.id}`} /><span data-testid={`admin-product-status-${p.id}`} className={`status-pill ${p.active ? 'confirmed' : 'inactive'}`}>{p.active ? 'Active' : 'Inactive'}</span></div><div className="admin-product-info"><small>{CATEGORIES.find(c => c.id === p.section)?.label} · {p.metal}</small><h3>{p.title}</h3><p>{p.weight} g</p><div className="admin-product-actions"><button className="text-button" data-testid={`admin-edit-product-${p.id}`} onClick={() => setEditor(p)}><Pencil size={15} /> Edit</button><button className="icon-button" data-testid={`admin-toggle-product-${p.id}`} disabled={busy === p.id} onClick={() => toggle(p)} aria-label={p.active ? `Deactivate ${p.title}` : `Activate ${p.title}`}>{busy === p.id ? <Loader2 size={16} className="animate-spin" /> : p.active ? <EyeOff size={16} /> : <Eye size={16} />}</button><button className="icon-button danger-text" data-testid={`admin-delete-product-${p.id}`} onClick={() => setDeleting(p)} aria-label={`Delete ${p.title}`}><Trash2 size={16} /></button></div></div></article>)}</div>}
    {editor && <ProductEditor product={editor.id ? editor : null} onClose={() => setEditor(null)} onSaved={reload} />}
    <Dialog open={!!deleting} onOpenChange={open => { if (!open && !busy) setDeleting(null); }}><DialogContent className="lux-modal" data-testid="delete-product-dialog" lang="en"><DialogHeader><DialogTitle>Delete this jewellery?</DialogTitle><DialogDescription>“{deleting?.title}” will be permanently removed from your catalog. To hide it temporarily, use deactivate instead.</DialogDescription></DialogHeader><div className="form-actions"><button className="outline-button" data-testid="delete-product-cancel" onClick={() => setDeleting(null)} disabled={!!busy}>Keep Jewellery</button><button className="danger-button" data-testid="delete-product-confirm" onClick={remove} disabled={!!busy}>{busy ? 'Deleting…' : 'Delete Jewellery'}</button></div></DialogContent></Dialog>
  </section>;
};
