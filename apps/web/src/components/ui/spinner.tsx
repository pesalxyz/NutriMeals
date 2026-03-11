export function Spinner({ label = 'Memuat...' }: { label?: string }) {
  return (
    <div className="spinner">
      <span aria-hidden className="spinner__dot" />
      <span className="small">{label}</span>
    </div>
  );
}
