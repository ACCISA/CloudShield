import React, { useRef, useState } from "react";
import PropTypes from "prop-types";

function CsvHelpPopover({
  title,
  requiredColumns,
  optionalColumns,
  exampleHeader,
  exampleRow,
  themeColors,
}) {
  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: "calc(100% + 8px)",
        minWidth: 340,
        maxWidth: 460,
        padding: "12px 14px",
        borderRadius: 10,
        border: `1px solid ${themeColors.border}`,
        background: themeColors.bgSecondary,
        color: themeColors.text,
        fontSize: 12,
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.24)",
        zIndex: 20,
        whiteSpace: "normal",
        transform: "translateY(0)",
        animation: "fadeInCsvHelp 140ms ease-out",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ opacity: 0.9, marginBottom: 6 }}>
        Required columns: {requiredColumns.join(", ")}
      </div>
      {optionalColumns.length > 0 && (
        <div style={{ opacity: 0.9, marginBottom: 8 }}>
          Optional columns: {optionalColumns.join(", ")}
        </div>
      )}
      <div
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          fontSize: 11,
          padding: "8px 10px",
          borderRadius: 6,
          border: `1px solid ${themeColors.borderLight || themeColors.border}`,
          background: "rgba(0, 0, 0, 0.08)",
        }}
      >
        {exampleHeader}
        <br />
        {exampleRow}
      </div>
    </div>
  );
}

CsvHelpPopover.propTypes = {
  title: PropTypes.string.isRequired,
  requiredColumns: PropTypes.arrayOf(PropTypes.string).isRequired,
  optionalColumns: PropTypes.arrayOf(PropTypes.string).isRequired,
  exampleHeader: PropTypes.string.isRequired,
  exampleRow: PropTypes.string.isRequired,
  themeColors: PropTypes.shape({
    border: PropTypes.string.isRequired,
    borderLight: PropTypes.string,
    bgSecondary: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
  }).isRequired,
};

/**
 * Reusable CSV import control with a hidden file input, a trigger button,
 * and an optional help tooltip.
 */
export default function CsvImportButton({
  button,
  onImport,
  importing = false,
  accept = ".csv,text/csv",
  helpTitle,
  requiredColumns,
  optionalColumns = [],
  exampleHeader,
  exampleRow,
  themeColors,
  helpButtonAriaLabel = "CSV format help",
}) {
  const inputRef = useRef(null);
  const [showHelp, setShowHelp] = useState(false);

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  const handleChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await onImport(file);
  };

  const trigger = React.isValidElement(button)
    ? React.cloneElement(button, {
        onClick: handleButtonClick,
        disabled: importing || button.props.disabled,
      })
    : button;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        style={{ display: "none" }}
      />

      {trigger}

      <div
        style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
        onMouseEnter={() => setShowHelp(true)}
        onMouseLeave={() => setShowHelp(false)}
      >
        <button
          type="button"
          aria-label={helpButtonAriaLabel}
          onClick={() => setShowHelp((v) => !v)}
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: `1px solid ${themeColors.border}`,
            background: "transparent",
            color: themeColors.text,
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          ?
        </button>
        {showHelp && (
          <CsvHelpPopover
            title={helpTitle}
            requiredColumns={requiredColumns}
            optionalColumns={optionalColumns}
            exampleHeader={exampleHeader}
            exampleRow={exampleRow}
            themeColors={themeColors}
          />
        )}
      </div>
    </>
  );
}

CsvImportButton.propTypes = {
  button: PropTypes.node.isRequired,
  onImport: PropTypes.func.isRequired,
  importing: PropTypes.bool,
  accept: PropTypes.string,
  helpTitle: PropTypes.string.isRequired,
  requiredColumns: PropTypes.arrayOf(PropTypes.string).isRequired,
  optionalColumns: PropTypes.arrayOf(PropTypes.string),
  exampleHeader: PropTypes.string.isRequired,
  exampleRow: PropTypes.string.isRequired,
  themeColors: PropTypes.shape({
    border: PropTypes.string.isRequired,
    borderLight: PropTypes.string,
    bgSecondary: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
  }).isRequired,
  helpButtonAriaLabel: PropTypes.string,
};
