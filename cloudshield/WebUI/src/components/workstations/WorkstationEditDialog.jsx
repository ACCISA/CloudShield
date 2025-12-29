import React from "react";
import WorkstationDialog from "./WorkstationDialog";
import StyledInput from "./StyledInput";
import PlanSelector from "./PlanSelector";
import UserAssignment from "./UserAssignment";
import { useWorkstationForm } from "./useWorkstationForm";
import {
  buttonStyles,
  formStyles,
  ActionButton,
} from "./workstationDialogStyles";

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
  const form = useWorkstationForm(row);

  /**
   * Submit updated workstation data to parent.
   */
  const handleSave = () => {
    onSave?.({
      name: form.name,
      code: row.code,
      currentUser: form.users[0] || "—",
      usersCount: form.users.length,
      plan: form.selectedPlan,
    });
  };

  const actions = (
    <>
      <ActionButton
        onClick={onDelete}
        style={buttonStyles.deleteButton}
        hoverStyle={{ backgroundColor: "#8a2323" }}
      >
        <span>🗑</span> Delete
      </ActionButton>

      <div style={formStyles.actionsRight}>
        <ActionButton
          onClick={onClose}
          style={buttonStyles.cancelButton}
          hoverStyle={{ backgroundColor: "rgba(255,255,255,0.14)" }}
        >
          Cancel
        </ActionButton>
        <ActionButton
          onClick={handleSave}
          style={buttonStyles.editButton}
          hoverStyle={{ backgroundColor: "#f2f2f2" }}
        >
          <span>✏️</span> Edit
        </ActionButton>
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
      <div style={formStyles.formGrid}>
        <StyledInput
          label="Name"
          value={form.name}
          onChange={(e) => form.setName(e.target.value)}
        />
        <StyledInput
          label="Group"
          value={form.group}
          onChange={(e) => form.setGroup(e.target.value)}
          placeholder="None"
        />
      </div>

      <PlanSelector
        selectedPlan={form.selectedPlan}
        onPlanSelect={form.setSelectedPlan}
        showCurrent={true}
      />

      <UserAssignment
        users={form.users}
        onToggleUser={form.toggleUser}
        showAllUsersCheckbox={false}
      />

      {/* Software */}
      <div style={formStyles.softwareSection}>
        <div style={formStyles.softwareHeader}>
          <div style={formStyles.sectionTitle}>Pre-Installed software</div>
          <label style={formStyles.checkboxContainer}>
            <input
              type="checkbox"
              checked={form.allSoftware}
              onChange={(e) => form.setAllSoftware(e.target.checked)}
              style={formStyles.checkbox}
            />
            <span>All software</span>
          </label>
        </div>
        <div style={formStyles.softwareButtons}>
          {[
            "Microsoft Word",
            "Microsoft Excel",
            "Slack",
            "Microsoft Teams",
            "Zoom",
          ].map((s) => (
            <button
              key={s}
              style={formStyles.softwareButton}
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
      <div style={formStyles.wallpaperSection}>
        <div style={formStyles.sectionTitle}>Desktop wallpaper</div>
        <div style={formStyles.wallpaperBox}>+</div>
      </div>
    </WorkstationDialog>
  );
}
