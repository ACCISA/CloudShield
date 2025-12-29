/**
 * SearchAutocomplete.jsx
 *
 * Autocomplete search field with:
 * - Search input
 * - Dropdown with results
 * - Suggested (most popular) items
 * - Keyboard navigation
 */

import { useState, useRef, useEffect } from "react";
import { getColorFromString, getInitials } from "../../utils/avatarUtils";
import Checkbox from "../common/Checkbox/Checkbox";

const styles = {
  container: {
    position: "relative",
    width: "100%",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  label: {
    fontSize: "0.875rem",
    color: "rgba(255,255,255,0.7)",
    margin: 0,
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    width: "100%",
    backgroundColor: "#111",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "10px",
    padding: "12px 16px",
    color: "#fff",
    fontSize: "0.9rem",
    outline: "none",
    transition: "all 0.2s",
    boxSizing: "border-box",
  },
  inputFocused: {
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "#1A1A1A",
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    backgroundColor: "#1A1A1A",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "10px",
    maxHeight: "280px",
    overflowY: "auto",
    zIndex: 10000,
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
  },
  section: {
    padding: "8px 0",
  },
  sectionTitle: {
    fontSize: "0.75rem",
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    fontWeight: 600,
    padding: "8px 16px 4px",
    margin: 0,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 16px",
    cursor: "pointer",
    transition: "background-color 0.15s",
  },
  itemHover: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  itemSelected: {
    backgroundColor: "rgba(59,130,246,0.2)",
  },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 600,
    fontSize: "0.75rem",
    flexShrink: 0,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: "0.875rem",
    color: "#fff",
    fontWeight: 500,
    margin: 0,
  },
  itemCode: {
    fontSize: "0.75rem",
    color: "rgba(255,255,255,0.5)",
    margin: 0,
  },
  noResults: {
    padding: "16px",
    textAlign: "center",
    color: "rgba(255,255,255,0.5)",
    fontSize: "0.875rem",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    fontSize: "0.875rem",
    color: "rgba(255,255,255,0.7)",
  },
};

export default function SearchAutocomplete({
  label,
  placeholder,
  items = [],
  suggestedItems = [],
  selectedItems = [],
  onSelect,
  showAllCheckbox = false,
  allSelected = false,
  onAllChange,
}) {
  const [search, setSearch] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter items based on search
  const filteredItems = search.trim()
    ? items.filter((item) => {
        const searchLower = search.toLowerCase();
        return (
          item.name?.toLowerCase().includes(searchLower) ||
          item.code?.toLowerCase().includes(searchLower) ||
          item.id?.toLowerCase().includes(searchLower)
        );
      })
    : [];

  // Get suggested items that aren't already selected
  const availableSuggested = suggestedItems.filter(
    (item) => !selectedItems.find((s) => s.id === item.id)
  );

  const showDropdown =
    isFocused && (search.trim() || availableSuggested.length > 0);
  const displayItems = search.trim() ? filteredItems : availableSuggested;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !inputRef.current.contains(event.target)
      ) {
        setIsFocused(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!showDropdown) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < displayItems.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && displayItems[highlightedIndex]) {
          handleSelect(displayItems[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsFocused(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleSelect = (item) => {
    onSelect(item);
    setSearch("");
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        {label && <label style={styles.label}>{label}</label>}

        {showAllCheckbox && (
          <div
            style={styles.checkboxLabel}
            onClick={() => onAllChange?.(!allSelected)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onAllChange?.(!allSelected);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Select all ${label.replace("Assign ", "")}`}
          >
            <Checkbox
              checked={allSelected}
              onChange={(checked) => onAllChange?.(checked)}
            />
            <span>{label.replace("Assign ", "All ")}</span>
          </div>
        )}
      </div>

      <div style={styles.inputWrapper}>
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          style={{
            ...styles.input,
            ...(isFocused ? styles.inputFocused : {}),
          }}
        />

        {showDropdown && (
          <div ref={dropdownRef} style={styles.dropdown}>
            {displayItems.length === 0 ? (
              <div style={styles.noResults}>
                {search.trim()
                  ? "No results found"
                  : "No suggestions available"}
              </div>
            ) : (
              <div style={styles.section}>
                {!search.trim() && availableSuggested.length > 0 && (
                  <div style={styles.sectionTitle}>Suggested</div>
                )}
                {displayItems.map((item, index) => {
                  const displayName = item.name || item.code || item.id;
                  const avatarColor = getColorFromString(displayName);
                  const initials = getInitials(displayName);
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <div
                      key={item.id}
                      style={{
                        ...styles.item,
                        ...(isHighlighted ? styles.itemSelected : {}),
                      }}
                      onClick={() => handleSelect(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelect(item);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Select ${item.name || item.code || item.id}`}
                      onMouseEnter={(e) => {
                        if (!isHighlighted) {
                          e.currentTarget.style.backgroundColor =
                            styles.itemHover.backgroundColor;
                        }
                        setHighlightedIndex(index);
                      }}
                      onMouseLeave={(e) => {
                        if (!isHighlighted) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      <div
                        style={{
                          ...styles.avatar,
                          backgroundColor: avatarColor,
                        }}
                      >
                        {initials}
                      </div>
                      <div style={styles.itemInfo}>
                        <div style={styles.itemName}>{displayName}</div>
                        {item.code && item.name && (
                          <div style={styles.itemCode}>{item.code}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
