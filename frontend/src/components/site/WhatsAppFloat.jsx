import { MessageCircle } from 'lucide-react';
import { waLink } from '@/lib/data';
export const WhatsAppFloat = () => <a className="whatsapp-float" data-testid="whatsapp-concierge-float" href={waLink()} target="_blank" rel="noopener noreferrer" aria-label="व्हॉट्सॲपवर चौकशी करा"><MessageCircle size={23} /><span>चौकशी करा</span></a>;
