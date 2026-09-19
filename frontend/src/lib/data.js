export const WA_NUMBER = "919890271037";
export const PHONE_DISPLAY = "+91 9890271037";
export const DEFAULT_WA_MESSAGE = "नमस्कार न्यू अलंकार ज्वेलर्स, मला या दागिन्याबद्दल अधिक माहिती हवी आहे.";
export const waLink = (message = DEFAULT_WA_MESSAGE, number = WA_NUMBER) => `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
export const API = `${process.env.REACT_APP_BACKEND_URL.replace(/\/$/, "")}/api`;
export const imageSource = (url) => url.startsWith('/api/') ? `${process.env.REACT_APP_BACKEND_URL.replace(/\/$/, '')}${url}` : url;

export const CATEGORIES = [
  { id: 'all', label: 'सर्व दागिने', english: 'All Ornaments' },
  { id: 'ring', label: 'अंगठी', english: 'Ring' },
  { id: 'necklace', label: 'नेकलेस / हार', english: 'Necklace' },
  { id: 'bangles', label: 'बांगड्या / तोडे', english: 'Bangles' },
  { id: 'mangalsutra', label: 'मंगळसूत्र', english: 'Mangalsutra' },
  { id: 'earrings', label: 'कानातले', english: 'Earrings' },
  { id: 'chain', label: 'चेन', english: 'Chain' },
  { id: 'silver_jewelry', label: 'चांदीचे दागिने', english: 'Silver Jewelry' },
  { id: 'rani_haar', label: 'राणी हार', english: 'Rani Haar' },
  { id: 'other', label: 'इतर', english: 'Other Custom' },
];
export const METAL_INTERESTS = ['Gold 24K', 'Gold 22K', 'Gold 18K', 'Silver', 'Platinum'];
export const METAL_LABELS = { 'Gold 24K': '२४ कॅरेट सोने', 'Gold 22K': '२२ कॅरेट सोने', 'Gold 18K': '१८ कॅरेट सोने', Silver: 'चांदी', Platinum: 'प्लॅटिनम' };
export const TIME_SLOTS = ['11:00 AM', '12:30 PM', '02:00 PM', '03:30 PM', '05:00 PM', '06:30 PM', '07:30 PM'];
export const indianPhone = (phone) => { const digits = phone.replace(/\D/g, ''); return digits.length === 10 ? `91${digits}` : digits; };
export const todayIndia = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
