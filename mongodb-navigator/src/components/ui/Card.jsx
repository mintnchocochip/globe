export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white p-4 shadow-md transition-colors dark:border-slate-800 dark:bg-slate-900 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`mb-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }) {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 transition-colors dark:text-slate-100 ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={`text-slate-700 transition-colors dark:text-slate-200 ${className}`} {...props}>
      {children}
    </div>
  );
}