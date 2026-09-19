import { useState } from 'react';
import { UploadCloud, Loader2, CheckCircle2 } from 'lucide-react';
import { TextField } from '@/components/FormFields';
import { ProductImage } from '@/components/site/ProductImage';
import { apiRequest } from '@/lib/api';

export const ImageUpload = ({ value, onChange, busy, setBusy }) => {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('');
  const [error, setError] = useState('');
  const upload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    e.target.value = '';
    setError(''); setProgress(0);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024 || file.size === 0) { setError('Choose a JPG, PNG or WebP photo up to 8 MB.'); return; }
    setBusy(true); setPhase('Preparing secure upload…');
    try {
      const start = await apiRequest('/admin/uploads', { method: 'POST', body: { filename: file.name, size: file.size, content_type: file.type } });
      for (let offset = 0, index = 0; offset < file.size; offset += start.chunk_size, index++) {
        setPhase('Uploading jewellery photo…');
        await apiRequest(`/admin/uploads/${start.id}/chunks/${index}`, { method: 'PUT', body: file.slice(offset, offset + start.chunk_size) });
        setProgress(Math.round(Math.min(offset + start.chunk_size, file.size) / file.size * 90));
      }
      setPhase('Validating and saving your photo…');
      const result = await apiRequest(`/admin/uploads/${start.id}/complete`, { method: 'POST' });
      onChange(result.image_url); setProgress(100); setPhase('Photo uploaded securely');
    } catch (err) { setError(err.message); setPhase(''); }
    finally { setBusy(false); }
  };
  return <div className="photo-editor"><label className={`upload-zone ${busy ? 'disabled' : ''}`} htmlFor="admin-product-photo-upload"><UploadCloud size={26} strokeWidth={1.3} /><strong>Upload Jewellery Photo</strong><span>JPG, PNG or WebP · Up to 8 MB</span><input id="admin-product-photo-upload" data-testid="admin-product-photo-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={busy} /></label>
    {phase && <div className="upload-progress" data-testid="upload-progress" role="status"><span>{busy ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle2 size={15} />} {phase} {progress}%</span><progress value={progress} max={100} aria-label="Photo upload progress" /></div>}
    <div className="or-divider">or use a direct image URL</div><TextField id="admin-product-image-input" label="Image URL" placeholder="https://…" value={value.startsWith('/api/') ? '' : value} disabled={busy} onChange={e => { onChange(e.target.value); setPhase(''); setError(''); }} />
    {value && <div className="image-preview" data-testid="admin-image-preview"><ProductImage key={value} url={value} title="Jewellery photo preview" testId="admin-preview-image" /></div>}
    {error && <p className="inline-error" data-testid="upload-error" role="alert">{error}</p>}
  </div>;
};
