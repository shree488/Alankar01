import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LockKeyhole, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { TextField } from '@/components/FormFields';
import { apiRequest, publishChange } from '@/lib/api';
import { AdminWorkspace } from '@/components/admin/AdminWorkspace';

const LockScreen = ({ onUnlock, notice }) => {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  
  const login = async e => {
    e.preventDefault(); 
    setBusy(true); 
    setError('');
    
    const submittedPassword = password;
    setPassword(''); // Clear immediately so DOM is empty before potential unmount
    
    try { 
      await apiRequest('/auth/login', { method: 'POST', body: { password: submittedPassword } }); 
      sessionStorage.removeItem('naj-owner-locked'); 
      sessionStorage.setItem('naj-owner-session', 'active'); 
      onUnlock(); 
    } catch (err) { 
      setPassword(submittedPassword); // Restore if login failed
      setError(err.message); 
    } finally { 
      setBusy(false); 
    }
  };

  return <main className="lock-screen" data-testid="admin-lock-screen"><Link className="lock-back text-button" data-testid="lock-back-to-store" to="/"><ArrowLeft size={17} /> Back to Store</Link><div className="lock-panel"><img src="/crest.png" alt="New Alankar Jewellers crest" /><p className="english-eyebrow">NEW ALANKAR JEWELLERS</p><div className="lock-divider" /><span className="modal-icon"><LockKeyhole size={23} strokeWidth={1.3} /></span><h1>Owner Portal</h1><p className="lock-subtitle">A private space for your collection.<br />Enter your master password to continue.</p><form onSubmit={login} className="lux-form" autoComplete="off"><input type="text" name="username" defaultValue="owner" autoComplete="username" style={{display: 'none'}} aria-hidden="true" /><div className="password-field"><TextField id="admin-password-input" label="Master Password" type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required maxLength={72} placeholder="Enter your password" /><button type="button" className="password-toggle" data-testid="admin-password-toggle" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{(error || notice) && <p role="alert" className="inline-error" data-testid="admin-login-error">{error || notice}</p>}<button disabled={busy} className="lux-button full-width" data-testid="admin-login-btn">{busy ? <Loader2 size={17} className="animate-spin" /> : <LockKeyhole size={17} />}{busy ? 'Unlocking…' : 'Unlock Owner Portal'}</button></form><p className="lock-security"><ShieldCheck size={14} /> Secure access · Owner only</p></div><p className="lock-tagline">पवित्रतेचे प्रतीक</p></main>;
};

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [notice, setNotice] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => {
    document.documentElement.lang = 'en';
    const meta = document.createElement('meta'); meta.name = 'robots'; meta.content = 'noindex, nofollow'; document.head.appendChild(meta);
    document.title = 'Owner Portal | NEW ALANKAR JEWELLERS';
    let active = true;
    if (sessionStorage.getItem('naj-owner-locked')) setUser(false);
    else apiRequest('/auth/me').then(() => { if (active) setUser(true); }).catch(error => { if (active) { setUser(false); if (error.status !== 401) setNotice('Could not verify your session. Please try logging in.'); } });
    const expired = () => { setUser(false); sessionStorage.removeItem('naj-owner-session'); sessionStorage.removeItem('naj_owner_token'); };
    const channel = new BroadcastChannel('naj-store'); channel.onmessage = event => { if (event.data === 'locked') { expired(); sessionStorage.setItem('naj-owner-locked', '1'); } };
    window.addEventListener('owner-session-expired', expired);
    return () => { active = false; meta.remove(); channel.close(); window.removeEventListener('owner-session-expired', expired); document.documentElement.lang = 'mr'; };
  }, []);
  const logout = async () => {
    setUser(false); setNotice(''); setLoggingOut(true); sessionStorage.removeItem('naj-owner-session'); sessionStorage.removeItem('naj_owner_token'); sessionStorage.setItem('naj-owner-locked', '1'); publishChange('locked');
    try { await apiRequest('/auth/logout', { method: 'POST' }); }
    catch { setNotice('Portal locked on this device. Network unavailable; reconnect to sign out on the server.'); toast.error('Could not complete server logout. Reconnect and retry.'); }
    finally { setLoggingOut(false); }
  };
  if (user === null || loggingOut) return <div className="auth-check" role="status" data-testid="admin-auth-check"><Loader2 className="animate-spin" /><p>{loggingOut ? 'Locking your session…' : 'Verifying secure session…'}</p></div>;
  if (!user) return <LockScreen onUnlock={() => { setNotice(''); setUser(true); }} notice={notice} />;
  return <div className="admin-shell" lang="en" data-testid="admin-dashboard"><header className="admin-header"><div className="section-wrap admin-header-row"><div className="brand"><img src="/crest.png" alt="New Alankar Jewellers" /><span><strong>NEW ALANKAR JEWELLERS</strong><small>OWNER PORTAL</small></span></div><div className="admin-header-actions"><Link className="outline-button" to="/" data-testid="admin-back-to-store"><ArrowLeft size={16} /> Back to Store</Link><button className="lux-button small" data-testid="admin-logout-btn" onClick={logout}><LockKeyhole size={16} /> Lock & Logout</button></div></div></header><AdminWorkspace /></div>;
}
