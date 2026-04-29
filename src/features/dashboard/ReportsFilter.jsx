import React, { useState, useMemo } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { useDebounce } from "../../hooks/useDebounce";
import { cn } from "../../utils/cn";

const FILTER_PILLS = [
  { label: "All", value: "" },
  { label: "Genuine", value: "GENUINE" },
  { label: "Suspicious", value: "SUSPICIOUS" },
  { label: "Fake", value: "FAKE" },
  { label: "Pinned", value: "pinned" },
  { label: "Favorites", value: "favorited" },
];

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Highest Score", value: "highest" },
  { label: "Lowest Score", value: "lowest" },
];

export default function ReportsFilter({ onChange }) {
  const [rawSearch, setRawSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [sort, setSort] = useState("newest");

  const search = useDebounce(rawSearch, 300);

  const filters = useMemo(() => {
    const f = { sort, search };
    if (activeFilter === "pinned") f.pinned = "true";
    else if (activeFilter === "favorited") f.favorited = "true";
    else if (activeFilter) f.verdict = activeFilter;
    return f;
  }, [sort, search, activeFilter]);

  React.useEffect(() => { onChange(filters); }, [filters, onChange]);

  return (
    <div className="reports-filter">
      <div className="filter-search-wrap">
        <Search size={14} className="filter-search-icon" />
        <input
          id="reports-search"
          type="text"
          className="filter-search"
          placeholder="Search reports..."
          value={rawSearch}
          onChange={(e) => setRawSearch(e.target.value)}
          aria-label="Search reports"
        />
      </div>

      <div className="filter-pills">
        {FILTER_PILLS.map(({ label, value }) => (
          <button
            key={value || "all"}
            className={cn("filter-pill", activeFilter === value && "filter-pill-active")}
            onClick={() => setActiveFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="filter-sort">
        <SlidersHorizontal size={13} className="filter-sort-icon" />
        <select
          className="filter-select"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Sort reports"
        >
          {SORT_OPTIONS.map(({ label, value }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
