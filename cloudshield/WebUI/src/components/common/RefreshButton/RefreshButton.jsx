import { useMemo } from "react";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import RefreshIcon from "../../../assets/RefreshIcon";

const sizeMap = {
  small: 44,
  medium: 44,
  large: 48,
};

const spinnerSizeMap = {
  small: 20,
  medium: 20,
  large: 24,
};

export default function RefreshButton({
  onClick,
  disabled = false,
  loading = false,
  size = "medium",
  tooltip = "Refresh",
  sx = {},
}) {
  const buttonSize = sizeMap[size] || sizeMap.medium;
  const spinnerSize = spinnerSizeMap[size] || spinnerSizeMap.medium;

  const content = useMemo(() => {
    if (loading) {
      return <CircularProgress size={spinnerSize} />;
    }
    return (
      <RefreshIcon
        width={20}
        height={20}
        color="#fff"
        data-testid="RefreshOutlinedIcon"
      />
    );
  }, [loading, spinnerSize]);

  const button = (
    <IconButton
      className="MuiIconButton-root"
      onClick={async () => {
        if (disabled || loading) return;
        if (onClick) {
          await onClick();
        }
      }}
      disabled={disabled || loading}
      sx={{
        width: `${buttonSize}px`,
        height: `${buttonSize}px`,
        borderRadius: "24px",
        backgroundColor: "transparent",
        color: "#fff",
        transition: "background-color 0.2s ease",
        "&:hover": {
          backgroundColor: disabled || loading ? "transparent" : "#141414",
        },
        ...sx,
      }}
    >
      {loading ? (
        content
      ) : (
        <span data-testid="RefreshOutlinedIcon">{content}</span>
      )}
    </IconButton>
  );

  if (loading || tooltip === "") {
    return button;
  }

  return tooltip ? (
    <Tooltip title={tooltip} disableHoverListener={false}>
      <span>{button}</span>
    </Tooltip>
  ) : (
    button
  );
}
