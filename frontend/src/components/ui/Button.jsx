function Button({ children, className = '', ...props }) {
  return <button className={`rounded-lg bg-brand-600 px-5 py-3 font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${className}`} {...props}>{children}</button>;
}

export default Button;

