/**
 * WorkstationCreateDialog.jsx
 *
 * Purpose:
 *   Modal dialog used to create a new workstation. Collects name, group, plan and assigned users.
 *
 * Props:
 *   - open: boolean to control dialog visibility
 *   - onClose: callback when dialog should close
 *   - onCreate: callback with created workstation payload
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
    border: "none",
  },
  cancelButton: {
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.2)",
  },
  createButton: {
    color: "#000",
    backgroundColor: "#fff",
    padding: "8px 20px",
  },
};

/**
 * Modal dialog for creating a new workstation.
 * @param {Object} props
 * @param {boolean} props.open - Controls dialog visibility
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onCreate - Called with new workstation data on submit
 * @returns {JSX.Element} Create workstation dialog
 */
export default function WorkstationCreateDialog({ open, onClose, onCreate }) {
  const [name, setName] = useState("WS-001");
  const [group, setGroup] = useState("None");
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState(false);
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
   * Submit the new workstation data to parent.
   */
  const handleSubmit = () => {
    onCreate?.({
      name,
      code: name || "WS-NEW",
      group,
      users,
      allUsers,
      plan: selectedPlan,
    });
  };

  const actions = (
    <>
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
        onClick={handleSubmit}
        style={{ ...styles.button, ...styles.createButton }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = "#f2f2f2")
        }
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#fff")}
      >
        Create
      </button>
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
        showCurrent={false}
      />

      <UserAssignment
        users={users}
        onToggleUser={toggleUser}
        allUsers={allUsers}
        onAllUsersChange={setAllUsers}
        showAllUsersCheckbox={true}
      />
    </WorkstationDialog>
  );
}
