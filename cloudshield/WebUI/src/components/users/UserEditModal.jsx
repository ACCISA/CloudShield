import { useEffect } from "react";
import Breadcrumb from "./Breadcrumb";
import TrashIcon from "../../assets/TrashIcon";
import { useUserForm } from "./shared/useUserForm";
import {
  STEPS,
  getSuggestedItems,
  MOCK_WORKSTATIONS,
  MOCK_GROUPS,
  MOCK_FILES,
} from "./shared/userModalData";
import {
  BasicInfoStep,
  WorkstationsStep,
  GroupsStep,
  FilesStep,
} from "./shared/UserModalSteps";
import { modalStyles as styles } from "./shared/userModalStyles";

export default function UserEditModal({
  open,
  onClose,
  data,
  onSubmit,
  onDelete,
}) {
  const form = useUserForm();

  // Get suggested items (most popular - mock implementation)
  const suggestedWorkstations = getSuggestedItems(MOCK_WORKSTATIONS);
  const suggestedGroups = getSuggestedItems(MOCK_GROUPS);
  const suggestedFiles = getSuggestedItems(MOCK_FILES);

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

  const handleNext = () => {
    if (form.currentStep < STEPS.length - 1) {
      form.setCurrentStep(form.currentStep + 1);
    }
  };

  const handleBack = () => {
    if (form.currentStep > 0) {
      form.setCurrentStep(form.currentStep - 1);
    }
  };

  const handleStepClick = (step) => {
    if (step < form.currentStep) {
      form.setCurrentStep(step);
    }
  };

  if (!open) return null;

  const renderStepContent = () => {
    switch (form.currentStep) {
      case 0:
        return (
          <BasicInfoStep
            firstName={form.firstName}
            setFirstName={form.setFirstName}
            lastName={form.lastName}
            setLastName={form.setLastName}
            email={form.email}
            setEmail={form.setEmail}
            title={form.title}
            setTitle={form.setTitle}
            profileImage={form.profileImage}
            setProfileImage={form.setProfileImage}
            styles={styles}
          />
        );
      case 1:
        return (
          <WorkstationsStep
            selectedWorkstations={form.selectedWorkstations}
            setSelectedWorkstations={form.setSelectedWorkstations}
            allWorkstations={form.allWorkstations}
            setAllWorkstations={form.setAllWorkstations}
            suggestedWorkstations={suggestedWorkstations}
            styles={styles}
          />
        );
      case 2:
        return (
          <GroupsStep
            selectedGroups={form.selectedGroups}
            setSelectedGroups={form.setSelectedGroups}
            allGroups={form.allGroups}
            setAllGroups={form.setAllGroups}
            suggestedGroups={suggestedGroups}
            styles={styles}
          />
        );
      case 3:
        return (
          <FilesStep
            selectedFiles={form.selectedFiles}
            setSelectedFiles={form.setSelectedFiles}
            allFiles={form.allFiles}
            setAllFiles={form.setAllFiles}
            suggestedFiles={suggestedFiles}
            styles={styles}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ ...styles.modalOverlay, display: open ? "flex" : "none" }}>
      <div style={styles.modalContainer}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.title}>User › Edit User</div>
            <Breadcrumb
              steps={STEPS}
              currentStep={form.currentStep}
              onStepClick={handleStepClick}
            />
          </div>

          <button
            onClick={handleClose}
            style={styles.closeButton}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>{renderStepContent()}</div>

        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.footerLeft}>
            {form.currentStep > 0 && (
              <button onClick={handleBack} style={styles.backButton}>
                ← Back
              </button>
            )}
          </div>

          <div style={styles.footerRight}>
            {form.currentStep === 0 && (
              <button
                onClick={() => {
                  onDelete();
                  handleClose();
                }}
                style={styles.deleteButton}
              >
                <TrashIcon width={14} height={14} color="#DC2626" /> Delete
              </button>
            )}

            {form.currentStep < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!form.canProceed(form.currentStep)}
                style={{
                  ...styles.nextButton,
                  ...(form.canProceed(form.currentStep)
                    ? {}
                    : styles.disabledButton),
                }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={submitForm}
                disabled={!form.canProceed(form.currentStep)}
                style={{
                  ...styles.updateButton,
                  ...(form.canProceed(form.currentStep)
                    ? {}
                    : styles.disabledButton),
                }}
              >
                ✓ Update
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
