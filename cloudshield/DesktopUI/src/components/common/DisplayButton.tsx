import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
} from "react";

type LayoutOption = "list" | "icons";

interface DisplayButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  layout?: LayoutOption;
  onLayoutChange?: (layout: LayoutOption) => void;
}

const layoutOptions: Array<{
  value: LayoutOption;
  label: string;
  description: string;
}> = [
  {
    value: "list",
    label: "List",
    description: "Compact rows",
  },
  {
    value: "icons",
    label: "Icons",
    description: "Card grid",
  },
];

function ListLayoutIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "#fff" : "rgba(255,255,255,0.6)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 6h12" />
      <path d="M8 12h12" />
      <path d="M8 18h12" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </svg>
  );
}

function IconLayoutIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "#fff" : "rgba(255,255,255,0.6)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export default function DisplayButton({
  layout = "list",
  onLayoutChange,
  children = "Display",
  className = "",
  ...rest
}: DisplayButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const selectLayout = (nextLayout: LayoutOption) => {
    onLayoutChange?.(nextLayout);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        {...rest}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 rounded-xl border border-white/10 bg-[#101010] px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10 ${className}`.trim()}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
        </svg>
        {children}
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label="Display options"
          className="absolute left-0 top-full z-20 mt-2 w-64 rounded-2xl border border-white/10 bg-[#0f0f0f] p-3 shadow-[0_24px_64px_rgba(0,0,0,0.55)]"
        >
          <div className="grid grid-cols-2 gap-3">
            {layoutOptions.map((option) => {
              const isActive = layout === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => selectLayout(option.value)}
                  className={`flex h-28 flex-col items-center justify-center gap-2 rounded-xl border px-4 py-3 text-center transition ${
                    isActive
                      ? "border-white/20 bg-white/10"
                      : "border-transparent bg-transparent hover:border-white/10 hover:bg-white/5"
                  }`}
                >
                  {option.value === "list" ? (
                    <ListLayoutIcon active={isActive} />
                  ) : (
                    <IconLayoutIcon active={isActive} />
                  )}
                  <span
                    className={`text-sm ${
                      isActive ? "font-semibold text-white" : "text-white/70"
                    }`}
                  >
                    {option.label}
                  </span>
                  <span className="text-[11px] text-white/45">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
