export const Marquee = ({ children, duration = 40, className = "" }) => (
  <div className={`overflow-hidden ${className}`}>
    <div
      className="animate-marquee flex w-max items-center"
      style={{ animationDuration: `${duration}s` }}
    >
      <div className="flex items-center">{children}</div>
      <div className="flex items-center" aria-hidden="true">
        {children}
      </div>
    </div>
  </div>
);
