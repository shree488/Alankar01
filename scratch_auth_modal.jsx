const AuthModal = ({ onClose, onLogin }) => {
  const [step, setStep] = useState('initial');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleEsc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleEsc);
    return () => { document.body.style.overflow = 'auto'; window.removeEventListener('keydown', handleEsc); };
  }, [onClose]);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleGoogle = () => {
    window.location.href = ${API}/auth/google/login;
  };

  const handlePhoneSubmit = async (e) => {
    if (e) e.preventDefault();
    if (phone.length < 10) {
      setErrorMsg('????? ????? ?????? ???? ????');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await apiRequest('/auth/request-otp', { method: 'POST', body: { phone } });
      setStep('otp');
      setTimer(60); // 60 seconds cooldown for resend
    } catch (err) {
      if (err.message === 'sms_not_configured') {
        setErrorMsg('OTP ?????? ??? ???? (SMS provider not configured)');
      } else {
        setErrorMsg(err.message || '??????? ?????? ???. ????? ?????? ??????? ???.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (otp.length < 6) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const user = await apiRequest('/auth/verify-otp', { method: 'POST', body: { phone, otp } });
      onLogin(user);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'OTP ?????? ???.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-[400px] bg-white rounded-[24px] shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-5 right-5 text-stone-400 hover:text-[#3B1254] transition-colors" aria-label="Close">
          <CloseIcon size={20} />
        </button>
        
        <div className="text-center mb-8">
          <img src="/crest.png" alt="New Alankar Jewellers" className="h-14 mx-auto mb-3" />
          <h2 className="text-sm font-serif font-bold tracking-widest text-[#3B1254]">NEW ALANKAR JEWELLERS</h2>
          <p className="text-[#D4AF37] text-xs font-medium tracking-widest mt-1">?????????? ??????</p>
        </div>

        <h3 className="text-xl font-medium text-center text-[#3B1254] mb-6">????? ??? ????? ???? ?? ???</h3>

        {step === 'initial' ? (
          <div className="space-y-4">
            <button onClick={handleGoogle} className="w-full flex items-center justify-center gap-3 bg-white border border-stone-200 text-stone-700 font-medium py-3 px-4 rounded-xl hover:bg-stone-50 hover:shadow-sm transition-all">
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-stone-200"></div>
              <span className="flex-shrink-0 mx-4 text-stone-400 text-xs uppercase tracking-wider">Or</span>
              <div className="flex-grow border-t border-stone-200"></div>
            </div>

            <form onSubmit={handlePhoneSubmit} className="space-y-3">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 font-medium">+91</span>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Enter mobile number" 
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 pl-14 pr-4 outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all text-[#3B1254] font-medium"
                  required
                  pattern="[0-9]{10}"
                />
              </div>
              {errorMsg && <p className="text-red-500 text-xs text-center">{errorMsg}</p>}
              <button type="submit" disabled={loading || phone.length < 10} className="w-full bg-[#3B1254] text-white font-medium py-3 rounded-xl hover:bg-[#2A0D3C] disabled:opacity-50 transition-colors flex items-center justify-center">
                {loading ? <span className="flex items-center gap-2"><Loader2 size={18} className="animate-spin" /> OTP ????? ???...</span> : 'Request OTP'}
              </button>
            </form>
          </div>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <p className="text-center text-sm text-stone-600 mb-2">??????? ?????? ?????? OTP ?????? ???</p>
            <input 
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit OTP" 
              className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all text-center tracking-[0.5em] text-lg text-[#3B1254] font-medium"
              required
              autoFocus
              maxLength={6}
            />
            {errorMsg && <p className="text-red-500 text-xs text-center">{errorMsg}</p>}
            <button type="submit" disabled={loading || otp.length < 6} className="w-full bg-[#3B1254] text-white font-medium py-3 rounded-xl hover:bg-[#2A0D3C] disabled:opacity-50 transition-colors flex items-center justify-center">
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Verify OTP'}
            </button>
            
            <button type="button" disabled={timer > 0 || loading} onClick={handlePhoneSubmit} className="w-full text-center text-sm text-[#D4AF37] hover:text-[#3B1254] mt-2 disabled:opacity-50 disabled:hover:text-[#D4AF37]">
              {timer > 0 ? \Resend in \s\ : 'Resend OTP'}
            </button>
            <button type="button" onClick={() => { setStep('initial'); setOtp(''); setErrorMsg(''); }} className="w-full text-center text-xs text-stone-400 hover:text-[#3B1254] mt-1">
              Back to mobile number
            </button>
          </form>
        )}

        <div className="mt-8 text-center border-t border-stone-100 pt-5">
          <Link to="/admin" onClick={onClose} className="text-[11px] uppercase tracking-wider text-stone-400 hover:text-[#D4AF37] font-medium transition-colors">
            Admin / Owner Portal
          </Link>
        </div>
      </div>
    </div>
  );
};
