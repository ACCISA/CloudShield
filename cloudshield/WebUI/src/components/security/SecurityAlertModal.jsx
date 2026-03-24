import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import ReactMarkdown from "react-markdown"; 
import { useThemeColors } from "../../hooks/useThemeColors.js";
import HighAlertIcon from "../../assets/security/HighAlertIcon";
import ModerateAlertIcon from "../../assets/security/ModerateAlertIcon";
import LowAlertIcon from "../../assets/security/LowAlertIcon";
import DownloadButton from "../common/DownloadButton/DownloadButton";
import CheckmarkIcon from "../../assets/CheckmarkIcon";
import AiIcon from "../../assets/AiIcon";
// IMPORT YOUR NEW API WRAPPER HERE
import { explainSecurityAlert } from "../../api/threatsApi";

const RISK_CONFIG = {
  high: {
    label: "HIGH RISK",
    color: "#EB6560",
    icon: HighAlertIcon,
  },
  moderate: {
    label: "MODERATE RISK",
    color: "#EBAF60",
    icon: ModerateAlertIcon,
  },
  low: {
    label: "LOW RISK",
    color: "#607CEB",
    icon: LowAlertIcon,
  },
};

function SecurityAlertModal({ alert, isOpen, onClose, onMarkResolved, onMarkFalsePositive, onDownload }) {
  const [isHoveredResolve, setIsHoveredResolve] = useState(false);
  
  // AI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiError, setAiError] = useState(null);

  // Reset AI state when modal closes or alert changes
  useEffect(() => {
    if (!isOpen) {
      setAiAnalysis(null);
      setAiError(null);
      setIsAnalyzing(false);
    }
  }, [isOpen, alert]);

  if (!isOpen || !alert) return null;

  const riskConfig = RISK_CONFIG[alert.risk] || RISK_CONFIG.low;

  const handleMarkFalsePositive = () => {
    if (onMarkFalsePositive) onMarkFalsePositive();
    onClose();
  };

  const handleDownload = () => {
    if (onDownload) onDownload();
  };

  const handleMarkResolved = () => {
    if (onMarkResolved) onMarkResolved();
    onClose();
  };

  // Triggers the backend explanation route using the API wrapper
  const handleExpandAI = async () => {
    setIsAnalyzing(true);
    setAiError(null);

    try {
      const payload = {
        risk: alert.risk,
        type: alert.type,
        category: alert.category,
        source: alert.source,
        description: alert.description
      };

      const response = await explainSecurityAlert(payload);

      if (response && response.explanation) {
        setAiAnalysis(response.explanation);
      } else {
        throw new Error("Invalid response format from server.");
      }
    } catch (err) {
      console.error("Error expanding with AI:", err);
      setAiError("Failed to generate AI explanation. Please check your connection or try again later.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const styles = {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2000,
      padding: "20px",
    },
    modal: {
      backgroundColor: themeColors.bgSecondary,
      borderRadius: "16px",
      width: "100%",
      maxWidth: "800px",
      maxHeight: "90vh",
      overflow: "auto",
      border: `1px solid ${themeColors.borderLight}`,
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: "24px 32px",
      borderBottom: `1px solid ${themeColors.borderLight}`,
    },
    headerLeft: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    },
    titleRow: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    title: {
      fontSize: "24px",
      fontWeight: "600",
      color: themeColors.textPrimary,
      margin: 0,
    },
    riskBadge: {
      display: "inline-flex",
      alignItems: "center",
      padding: "4px 12px",
      borderRadius: "6px",
      backgroundColor: riskConfig.color,
      fontSize: "11px",
      fontWeight: "700",
      color: themeColors.textPrimary,
      letterSpacing: "0.5px",
    },
    id: {
      fontSize: "14px",
      color: themeColors.textSecondary,
      fontWeight: "400",
    },
    closeButton: {
      background: "none",
      border: "none",
      color: themeColors.textSecondary,
      fontSize: "28px",
      cursor: "pointer",
      padding: "0",
      width: "32px",
      height: "32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "6px",
      transition: "all 0.2s",
    },
    content: {
      padding: "32px",
    },
    detailsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "32px",
      marginBottom: "32px",
    },
    detailColumn: {
      display: "flex",
      flexDirection: "column",
      gap: "16px",
    },
    detailItem: {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
    },
    detailLabel: {
      fontSize: "11px",
      fontWeight: "600",
      color: themeColors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    detailValue: {
      fontSize: "15px",
      fontWeight: "500",
      color: themeColors.textPrimary,
    },
    descriptionSection: {
      marginBottom: "32px",
    },
    descriptionLabel: {
      fontSize: "11px",
      fontWeight: "600",
      color: themeColors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      marginBottom: "8px",
    },
    descriptionText: {
      fontSize: "14px",
      color: themeColors.textSecondary,
      lineHeight: "1.6",
      marginBottom: "16px",
    },
    aiBox: {
      position: "relative",
      backgroundColor: themeColors.bgPrimary,
      borderRadius: "12px",
      padding: "16px",
      minHeight: "200px",
      border: `1px solid ${themeColors.borderLight}`,
    },
    expandButton: {
      position: "absolute",
      top: "16px",
      right: "16px",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "8px 16px",
      backgroundColor: themeColors.textPrimary,
      border: "none",
      borderRadius: "8px",
      color: themeColors.bgPrimary,
      fontSize: "13px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.2s",
      opacity: isAnalyzing ? 0.5 : 1,
    },
    markdownContainer: {
      color: "rgba(255,255,255,0.9)",
      fontSize: "14px",
      lineHeight: "1.6",
    },
    loadingText: {
      color: "rgba(255,255,255,0.6)",
      fontSize: "14px",
      display: "flex",
      alignItems: "center",
      height: "100%",
    },
    errorText: {
      color: "#EB6560",
      fontSize: "14px",
    },
    footer: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "24px 32px",
      borderTop: `1px solid ${themeColors.borderLight}`,
    },
    falsePositiveButton: {
      background: "none",
      border: "none",
      color: themeColors.textSecondary,
      fontSize: "14px",
      fontWeight: "400",
      cursor: "pointer",
      textDecoration: "none",
      padding: "10px 20px",
      borderRadius: "8px",
      transition: "all 0.2s ease",
    },
    resolveButton: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "10px 20px",
      backgroundColor: isHoveredResolve
        ? themeColors.lightOverlay
        : themeColors.lightOverlaySubtle,
      border: `1px solid ${themeColors.border}`,
      borderRadius: "8px",
      color: themeColors.textPrimary,
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "all 0.2s ease",
    },
  };

  return (
    <div
      style={styles.overlay}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.titleRow}>
              <h2 style={styles.title}>Security Alert</h2>
              <span style={styles.riskBadge}>{riskConfig.label}</span>
            </div>
            <span style={styles.id}>ID: #{alert.id || "N/A"}</span>
          </div>
          <button
            style={styles.closeButton}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = themeColors.lightOverlaySubtle;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Details Grid */}
          <div style={styles.detailsGrid}>
            <div style={styles.detailColumn}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>TYPE</span>
                <span style={styles.detailValue}>{alert.type}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>DETECTED</span>
                <span style={styles.detailValue}>
                  {alert.displayDate || alert.date}
                </span>
              </div>
            </div>
            <div style={styles.detailColumn}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>CATEGORY</span>
                <span style={styles.detailValue}>
                  {alert.category || "File Upload"}
                </span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>STATUS</span>
                <span style={styles.detailValue}>
                  {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                </span>
              </div>
            </div>
            <div style={styles.detailColumn}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>SOURCE</span>
                <span style={styles.detailValue}>
                  {alert.source || "Unknown"}
                </span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>AFFECTED GROUP</span>
                <span style={styles.detailValue}>
                  {alert.affectedGroup || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={styles.descriptionSection}>
            <div style={styles.descriptionLabel}>DESCRIPTION</div>
            <p style={styles.descriptionText}>
              {alert.description || "No description available."}
            </p>
            
            {/* AI Explanation Box */}
            <div style={styles.aiBox}>
              {!aiAnalysis && (
                <button
                  style={styles.expandButton}
                  onClick={handleExpandAI}
                  disabled={isAnalyzing}
                  onMouseEnter={(e) => {
                    if (!isAnalyzing) e.currentTarget.style.backgroundColor = themeColors.bgSecondary;
                  e.currentTarget.style.color = themeColors.textPrimary;
                  }}
                  onMouseLeave={(e) => {
                    if (!isAnalyzing) e.currentTarget.style.backgroundColor = themeColors.textPrimary;
                  e.currentTarget.style.color = themeColors.bgPrimary;
                  }}
                >
                  <AiIcon width={14} height={14} color={themeColors.bgPrimary} />
                  {isAnalyzing ? "Analyzing..." : "Expand with AI"}
                </button>
              )}

              {isAnalyzing && !aiAnalysis && (
                <div style={styles.loadingText}>
                  Querying Cortex AI engine...
                </div>
              )}

              {aiError && (
                <div style={styles.errorText}>{aiError}</div>
              )}

              {aiAnalysis && (
                <div style={styles.markdownContainer}>
                  <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            style={styles.falsePositiveButton}
            onClick={handleMarkFalsePositive}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = "underline";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = "none";
            }}
          >
            Mark as false positive
          </button>
          <div style={{ display: "flex", gap: "12px" }}>
            <DownloadButton onClick={handleDownload} label="Download alert" />
            <button
              style={styles.resolveButton}
              onClick={handleMarkResolved}
              onMouseEnter={() => setIsHoveredResolve(true)}
              onMouseLeave={() => setIsHoveredResolve(false)}
            >
              <CheckmarkIcon width={16} height={16} color={themeColors.textPrimary} />
              Mark as resolved
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

SecurityAlertModal.propTypes = {
  alert: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    type: PropTypes.string,
    date: PropTypes.string,
    displayDate: PropTypes.string,
    activity: PropTypes.string,
    risk: PropTypes.string,
    status: PropTypes.string,
    category: PropTypes.string,
    source: PropTypes.string,
    affectedGroup: PropTypes.string,
    description: PropTypes.string,
  }),
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default SecurityAlertModal;