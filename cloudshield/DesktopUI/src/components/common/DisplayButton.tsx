import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
} from "react";
import DisplayIcon from "../../assets/DisplayButton/DisplayIcon";

type LayoutOption = "list" | "icons";

interface DisplayButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  layout?: LayoutOption;
  onLayoutChange?: (layout: LayoutOption) => void;
}

const layoutOptions: Array<{
  value: LayoutOption;
  label: string;
}> = [
  {
    value: "list",
    label: "List",
  },
  {
    value: "icons",
    label: "Icons",
  },
];

function ListLayoutIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="28"
      height="21"
      viewBox="0 0 28 21"
      fill="none"
      stroke={active ? "#fff" : "rgba(255,255,255,0.45)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 4h24" />
      <path d="M2 10.5h24" />
      <path d="M2 17h24" />
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
      <rect x="4" y="4" width="7" height="7" rx="1.25" />
      <rect x="13" y="4" width="7" height="7" rx="1.25" />
      <rect x="4" y="13" width="7" height="7" rx="1.25" />
      <rect x="13" y="13" width="7" height="7" rx="1.25" />
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
        className={`flex h-12 items-center gap-2 rounded-lg border border-white/10 bg-[#111111] px-4 text-sm font-medium text-white/80 transition-all duration-200 hover:border-white/20 hover:bg-[#151515] ${className}`.trim()}
      >
        <DisplayIcon width={16} height={16} color="currentColor" />
        {children}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setIsOpen(false);
              }
            }}
            role="button"
            tabIndex={-1}
            aria-label="Close display options"
          />

          <div
            id={menuId}
            role="menu"
            aria-label="Display options"
            className="absolute left-0 top-full z-20 mt-2 w-70 rounded-xl border border-white/10 bg-[#111111] p-3"
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
                    className={`flex h-25 flex-col items-center justify-center gap-2 rounded-xl px-4 py-3 text-center transition-all duration-200 ${
                      isActive
                        ? "border border-white/20 bg-white/8"
                        : "border border-transparent bg-transparent hover:bg-white/8"
                    }`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center">
                      {option.value === "list" ? (
                        <ListLayoutIcon active={isActive} />
                      ) : (
                        <IconLayoutIcon active={isActive} />
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        isActive ? "font-semibold text-white" : "text-white/70"
                      }`}
                    >
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
