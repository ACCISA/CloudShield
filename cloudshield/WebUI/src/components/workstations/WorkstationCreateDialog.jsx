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
 * Modal dialog for creating a new workstation.
 * @param {Object} props
 * @param {boolean} props.open - Controls dialog visibility
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onCreate - Called with new workstation data on submit
 * @returns {JSX.Element} Create workstation dialog
 */
export default function WorkstationCreateDialog({ open, onClose, onCreate }) {
  const form = useWorkstationForm();

  /**
   * Submit the new workstation data to parent.
   */
  const handleSubmit = () => {
    onCreate?.({
      name: form.name,
      code: form.name || "WS-NEW",
      group: form.group,
      users: form.users,
      allUsers: form.allUsers,
      plan: form.selectedPlan,
    });
  };

  const actions = (
    <>
      <ActionButton
        onClick={onClose}
        style={buttonStyles.cancelButton}
        hoverStyle={{ backgroundColor: "rgba(255,255,255,0.14)" }}
      >
        Cancel
      </ActionButton>
      <ActionButton
        onClick={handleSubmit}
        style={buttonStyles.createButton}
        hoverStyle={{ backgroundColor: "#f2f2f2" }}
      >
        Create
      </ActionButton>
    </>
  );

  return (
    <WorkstationDialog
      open={open}
      onClose={onClose}
      title="New Workstation"
      breadcrumb={["Workstations", "New Workstation"]}
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
        showCurrent={false}
      />

      <UserAssignment
        users={form.users}
        onToggleUser={form.toggleUser}
        allUsers={form.allUsers}
        onAllUsersChange={form.setAllUsers}
        showAllUsersCheckbox={true}
      />
    </WorkstationDialog>
  );
}
