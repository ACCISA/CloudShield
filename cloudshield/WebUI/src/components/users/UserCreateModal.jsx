import CreateButton from "../common/CreateButton/CreateButton";
import CreateUserIcon from "../../assets/CreateUserIcon";
import { useUserForm } from "./shared/useUserForm";
import BaseUserModal from "./shared/BaseUserModal";

export default function UserCreateModal({ open, onClose, onSubmit }) {
  const form = useUserForm();

  const submitForm = () => {
    onSubmit(form.getPayload());
    handleClose();
  };

  const handleClose = () => {
    form.resetForm();
    onClose();
  };

  const renderFooterActions = (form) => (
    <CreateButton
      icon={<CreateUserIcon width={16} height={16} color="#fff" />}
      buttonText="Create"
      onClick={submitForm}
      disabled={!form.canProceed(form.currentStep)}
    />
  );

  return (
    <BaseUserModal
      open={open}
      onClose={handleClose}
      form={form}
      title="User › New User"
      renderFooterActions={renderFooterActions}
    />
  );
}
