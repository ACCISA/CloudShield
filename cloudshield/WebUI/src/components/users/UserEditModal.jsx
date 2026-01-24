import { useEffect } from "react";
import TrashIcon from "../../assets/TrashIcon";
import { useUserForm } from "./shared/useUserForm";
import { modalStyles as styles } from "./shared/userModalStyles";
import BaseUserModal from "./shared/BaseUserModal";

export default function UserEditModal({
  open,
  onClose,
  data,
  onSubmit,
  onDelete,
}) {
  const form = useUserForm();

  // Load existing data when modal opens
  useEffect(() => {
    if (data && open) {
      const nameParts = data.name ? data.name.split(" ") : [];
      form.setFirstName(nameParts[0] || "");
      form.setLastName(nameParts[1] || "");
      form.setEmail(data.email || "");
      form.setTitle(data.title || "");
      // TODO: Load existing workstations, groups, files from data
    }
  }, [data, open]);

  const submitForm = () => {
    onSubmit(form.getPayload());
    handleClose();
  };

  const handleClose = () => {
    form.setCurrentStep(0);
    onClose();
  };

  const renderExtraHeaderActions = () =>
    form.currentStep === 0 ? (
      <button
        onClick={() => {
          onDelete();
          handleClose();
        }}
        style={styles.deleteButton}
      >
        <TrashIcon width={14} height={14} color="#DC2626" /> Delete
      </button>
    ) : null;

  const renderFooterActions = (form) => (
    <button
      onClick={submitForm}
      disabled={!form.canProceed(form.currentStep)}
      style={{
        ...styles.updateButton,
        ...(form.canProceed(form.currentStep) ? {} : styles.disabledButton),
      }}
    >
      ✓ Update
    </button>
  );

  return (
    <BaseUserModal
      open={open}
      onClose={handleClose}
      form={form}
      title="User › Edit User"
      renderFooterActions={renderFooterActions}
      renderExtraHeaderActions={renderExtraHeaderActions}
    />
  );
}
