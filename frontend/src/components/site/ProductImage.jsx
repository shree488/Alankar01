import { useEffect, useState } from 'react';
import { Gem } from 'lucide-react';
import { imageSource } from '@/lib/data';

export const ProductImage = ({ url, title, testId, onValidity }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [url]);
  return failed || !url ? <div className="image-placeholder" data-testid={testId}><Gem size={36} strokeWidth={1} /><span>छायाचित्र उपलब्ध नाही</span></div> :
    <img data-testid={testId} src={imageSource(url)} alt={title} onLoad={() => onValidity?.(true)} onError={() => { setFailed(true); onValidity?.(false); }} loading="lazy" />;
};
