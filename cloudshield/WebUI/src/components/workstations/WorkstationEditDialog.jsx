/**
 * WorkstationEditDialog.jsx
 *
 * Purpose:
 *   Modal dialog for editing an existing workstation's properties (name, users, plan, etc.).
 *
 * Props:
 *   - open: boolean controlling visibility
 *   - onClose: close handler
 *   - row: the workstation row being edited
 *   - onSave: save callback
 *   - onDelete: delete callback
 */
import React, { useState } from "react";
import WorkstationDialog from "./WorkstationDialog";
import StyledInput from "./StyledInput";
import PlanSelector from "./PlanSelector";
import UserAssignment from "./UserAssignment";

const styles = {
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  button: {
    textTransform: "none",
    borderRadius: "12px",
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: "1rem",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  deleteButton: {
    color: "#fff",
    backgroundColor: "#7c1d1d",
    border: "none",
  },
  cancelButton: {
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.2)",
  },
  editButton: {
    color: "#000",
    backgroundColor: "#fff",
    padding: "8px 20px",
    border: "none",
  },
  actionsRight: {
    display: "flex",
    gap: "10px",
    marginLeft: "auto",
  },
  softwareSection: {
    marginTop: "16px",
  },
  softwareHeader: {
    display: "flex",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontWeight: 600,
    color: "#fff",
  },
  checkboxContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    cursor: "pointer",
    accentColor: "#fff",
  },
  softwareButtons: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  softwareButton: {
    textTransform: "none",
    color: "#fff",
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "transparent",
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: "0.875rem",
  },
  wallpaperSection: {
    marginTop: "16px",
  },
  wallpaperBox: {
    marginTop: "8px",
    width: "120px",
    height: "90px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.05)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "rgba(255,255,255,0.6)",
    fontSize: "2rem",
    cursor: "pointer",
  },
};

/**
 * Modal dialog for editing an existing workstation.
 * @param {Object} props
 * @param {boolean} props.open - Controls dialog visibility
 * @param {Function} props.onClose - Close handler
 * @param {Object} props.row - Workstation data being edited
 * @param {Function} props.onSave - Called with updated workstation data
 * @param {Function} props.onDelete - Called to delete the workstation
 * @returns {JSX.Element} Edit workstation dialog
 */
export default function WorkstationEditDialog({
  open,
  onClose,
  row,
  onSave,
  onDelete,
}) {
  const [name, setName] = useState(row?.name || "");
  const [group, setGroup] = useState("None");
  const [users, setUsers] = useState([row?.currentUser].filter(Boolean));
  const [allSoftware, setAllSoftware] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("BASIC");

  /**
   * Toggle a user in the selected users list.
   * @param {string} u - User name to toggle
   */
  const toggleUser = (u) =>
    setUsers((prev) =>
      prev.includes(u) ? prev.filter((x) => x !== u) : [...prev, u]
    );

  /**
   * Submit updated workstation data to parent.
   */
  const handleSave = () => {
    onSave?.({
      name,
      code: row.code,
      currentUser: users[0] || "—",
      usersCount: users.length,
      plan: selectedPlan,
    });
  };

  const actions = (
    <>
      <button
        onClick={onDelete}
        style={{ ...styles.button, ...styles.deleteButton }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = "#8a2323")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = "#7c1d1d")
        }
      >
        <span>🗑</span> Delete
      </button>

      <div style={styles.actionsRight}>
        <button
          onClick={onClose}
          style={{ ...styles.button, ...styles.cancelButton }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.14)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")
          }
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          style={{ ...styles.button, ...styles.editButton }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#f2f2f2")
          }
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#fff")}
        >
          <span>✏️</span> Edit
        </button>
      </div>
    </>
  );

  return (
    <WorkstationDialog
      open={open}
      onClose={onClose}
      title="Edit Workstation"
      breadcrumb={["Workstations", "Edit Workstation"]}
      actions={actions}
    >
      <div style={styles.formGrid}>
        <StyledInput
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <StyledInput
          label="Group"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          placeholder="None"
        />
      </div>

      <PlanSelector
        selectedPlan={selectedPlan}
        onPlanSelect={setSelectedPlan}
        showCurrent={true}
      />

      <UserAssignment
        users={users}
        onToggleUser={toggleUser}
        showAllUsersCheckbox={false}
      />

      {/* Software */}
      <div style={styles.softwareSection}>
        <div style={styles.softwareHeader}>
          <div style={styles.sectionTitle}>Pre-Installed software</div>
          <label style={styles.checkboxContainer}>
            <input
              type="checkbox"
              checked={allSoftware}
              onChange={(e) => setAllSoftware(e.target.checked)}
              style={styles.checkbox}
            />
            <span>All software</span>
          </label>
        </div>
        <div style={styles.softwareButtons}>
          {[
            "Microsoft Word",
            "Microsoft Excel",
            "Slack",
            "Microsoft Teams",
            "Zoom",
          ].map((s) => (
            <button
              key={s}
              style={styles.softwareButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)";
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Wallpaper picker placeholder */}
      <div style={styles.wallpaperSection}>
        <div style={styles.sectionTitle}>Desktop wallpaper</div>
        <div style={styles.wallpaperBox}>+</div>
      </div>
    </WorkstationDialog>
  );
}
