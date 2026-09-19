const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const containerRef = useRef();
  const fileInputRef = useRef();

  const handleSearch = (e) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('naj-search', { detail: query }));
    const collections = document.getElementById('collections');
    if (collections) collections.scrollIntoView({ behavior: 'smooth' });
    setFocused(false);
    document.activeElement?.blur();
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setFocused(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      setFocused(false);
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const suggestions = query ? CATEGORIES.filter(c => c.label.includes(query) || (c.english && c.english.toLowerCase().includes(query.toLowerCase()))).slice(0, 5) : CATEGORIES.slice(1, 6);

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={handleSearch} className={\lex items-center w-full h-11 bg-white border rounded-full px-4 transition-colors \\}>
        <Search size={18} className="text-[#3B1254] flex-shrink-0" />
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="?????? ????... (???. ?????, ??????, ?????????)"
          className="flex-1 bg-transparent border-none outline-none px-3 text-sm text-[#3B1254] placeholder:text-stone-400 min-w-0"
          aria-label="?????? ????"
        />
        <div className="flex items-center flex-shrink-0 pl-1">
          <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className={\	ransition-colors flex items-center justify-center w-8 h-8 rounded-full \\} title="Search by image" aria-label="Image Search">
            <Camera size={18} strokeWidth={2} />
          </button>
        </div>
      </form>
      
      {focused && !imagePreview && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-stone-200 rounded-xl shadow-xl py-2 z-50 overflow-hidden">
          <p className="px-4 py-1 text-xs font-semibold text-stone-400 uppercase tracking-wider">Suggestions</p>
          {suggestions.map(s => (
            <button 
              key={s.id}
              type="button"
              className="w-full text-left px-4 py-2 text-sm text-[#3B1254] hover:bg-stone-50 hover:text-[#D4AF37] transition-colors"
              onClick={() => { setQuery(s.label); window.dispatchEvent(new CustomEvent('naj-search', { detail: s.id === 'all' ? '' : s.label })); setFocused(false); document.getElementById('collections')?.scrollIntoView({ behavior: 'smooth' }); }}
            >
              <Search size={14} className="inline mr-2 text-stone-400" />
              {s.label}
            </button>
          ))}
          {suggestions.length === 0 && (
            <p className="px-4 py-3 text-sm text-stone-500">No matching categories. Try searching for specific items.</p>
          )}
        </div>
      )}

      {imagePreview && (
        <div className="absolute top-full right-0 mt-2 p-3 bg-white border border-stone-200 rounded-xl shadow-lg z-50 flex items-start gap-3 w-[260px] animate-in fade-in zoom-in duration-200">
          <img src={imagePreview} alt="Selected for search" className="w-14 h-14 object-cover rounded-md border border-stone-100 flex-shrink-0" />
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-sm text-[#3B1254] font-medium leading-tight mb-1">Image selected</p>
            <p className="text-xs text-stone-500 leading-tight">Image search is being prepared...</p>
          </div>
          <button type="button" onClick={clearImage} className="text-stone-400 hover:text-[#3B1254] flex-shrink-0 p-1 -mr-1 -mt-1" aria-label="Remove image">
            <CloseIcon size={16} />
          </button>
        </div>
      )}
    </div>
  );
};
