import { FiSearch } from "react-icons/fi";

// Shared search box for feature-page lists. Filtering itself happens per
// page (each page's rows have different searchable fields), this is just
// the consistent input UI.
export default function SearchInput({ value, onChange, placeholder = "ابحث…" }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3.5 py-2.5 transition-colors focus-within:border-primary">
      <FiSearch className="shrink-0 text-ink-faint" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full text-sm outline-none placeholder:text-ink-faint"
      />
    </div>
  );
}
