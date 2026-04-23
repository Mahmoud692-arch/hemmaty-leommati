export default function OrnamentalDivider({ symbol = "۞" }: { symbol?: string }) {
  return (
    <div className="ornamental-divider my-8 max-w-md mx-auto">
      <span className="text-[var(--gold)] text-xl">{symbol}</span>
    </div>
  );
}
