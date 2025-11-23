import { useState, useEffect } from "react";
import Breadcrumb from "./Breadcrumb";
import ProfilePictureUpload from "./ProfilePictureUpload";
import SearchAutocomplete from "./SearchAutocomplete";
import AssignmentCard from "./AssignmentCard";
import TrashIcon from "../../assets/TrashIcon";
import CreateButton from "../common/CreateButton/CreateButton";

// Mock data - TODO: Replace with API calls
const MOCK_WORKSTATIONS = [
  { id: "ws-1", name: "Development", code: "WS-001" },
  { id: "ws-2", name: "Marketing", code: "WS-002" },
  { id: "ws-3", name: "Sales", code: "WS-003" },
  { id: "ws-4", name: "Finance", code: "WS-004" },
  { id: "ws-5", name: "HR", code: "WS-005" },
];

const MOCK_GROUPS = [
  { id: "g-1", name: "Sales", code: "SALES" },
  { id: "g-2", name: "Finance", code: "FIN" },
  { id: "g-3", name: "Reception", code: "RECEP" },
  { id: "g-4", name: "Warehouse", code: "WARE" },
  { id: "g-5", name: "Manager", code: "MGR" },
];

const MOCK_FILES = [
  { id: "f-1", name: "Sales Documents", code: "DOC-001" },
  { id: "f-2", name: "Finance Reports", code: "DOC-002" },
  { id: "f-3", name: "Reception Files", code: "DOC-003" },
  { id: "f-4", name: "Manager Files", code: "DOC-004" },
];

const STEPS = ["Basic Info", "Workstations", "Groups", "Files"];

export default function UserEditModal({
  open,
  onClose,
  data,
  onSubmit,
  onDelete,
}) {
  // Step management
  const [currentStep, setCurrentStep] = useState(0);

  // Form data
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [profileImage, setProfileImage] = useState(null);

  // Assignments
  const [selectedWorkstations, setSelectedWorkstations] = useState([]);
  const [allWorkstations, setAllWorkstations] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [allGroups, setAllGroups] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [allFiles, setAllFiles] = useState(false);

  // Get suggested items (most popular - mock implementation)
  const suggestedWorkstations = MOCK_WORKSTATIONS.slice(0, 3);
  const suggestedGroups = MOCK_GROUPS.slice(0, 3);
  const suggestedFiles = MOCK_FILES.slice(0, 3);

  // Load existing data when modal opens
  useEffect(() => {
    if (data && open) {
      const nameParts = data.name ? data.name.split(" ") : [];
      setFirstName(nameParts[0] || "");
      setLastName(nameParts[1] || "");
      setEmail(data.email || "");
      setTitle(data.title || "");
      // TODO: Load existing workstations, groups, files from data
    }
  }, [data, open]);

  const submitForm = () => {
    const payload = {
      firstName,
      lastName,
      email,
      jobTitle: title,
      profileImage,
      workstations: allWorkstations ? "all" : selectedWorkstations,
      groups: allGroups ? "all" : selectedGroups,
      files: allFiles ? "all" : selectedFiles,
    };
    onSubmit(payload);
    handleClose();
  };

  const handleClose = () => {
    // Reset form
    setCurrentStep(0);
    onClose();
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (step) => {
    if (step < currentStep) {
      setCurrentStep(step);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return (
          firstName.trim() && lastName.trim() && email.trim() && title.trim()
        );
      case 1:
        return allWorkstations || selectedWorkstations.length > 0;
      case 2:
        return true; // Groups are optional
      case 3:
        return true; // Files are optional
      default:
        return false;
    }
  };

  if (!open) return null;

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderBasicInfo();
      case 1:
        return renderWorkstations();
      case 2:
        return renderGroups();
      case 3:
        return renderFiles();
      default:
        return null;
    }
  };

  const renderBasicInfo = () => (
    <div style={styles.stepContent}>
      <ProfilePictureUpload
        firstName={firstName}
        lastName={lastName}
        onImageChange={setProfileImage}
      />

      <div style={styles.formGrid}>
        <div style={styles.formGroup}>
          <label style={styles.label}>First Name</label>
          <input
            type="text"
            placeholder="John"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Last Name</label>
          <input
            type="text"
            placeholder="Doe"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            placeholder="johndoe@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
          <label style={styles.label}>Title</label>
          <input
            type="text"
            placeholder="Software Engineer"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={styles.input}
          />
        </div>
      </div>
    </div>
  );

  const renderWorkstations = () => {
    const displayWorkstations = allWorkstations
      ? MOCK_WORKSTATIONS
      : selectedWorkstations;

    return (
      <div style={styles.stepContent}>
        <SearchAutocomplete
          label="Assign Workstations"
          placeholder="Search for workstations"
          items={MOCK_WORKSTATIONS}
          suggestedItems={suggestedWorkstations}
          selectedItems={selectedWorkstations}
          onSelect={(item) =>
            setSelectedWorkstations([...selectedWorkstations, item])
          }
          showAllCheckbox={true}
          allSelected={allWorkstations}
          onAllChange={(checked) => {
            setAllWorkstations(checked);
            if (checked) {
              setSelectedWorkstations([]);
            }
          }}
        />

        {(displayWorkstations.length > 0 || allWorkstations) && (
          <div style={styles.assignedSection}>
            <div style={styles.assignedLabel}>
              {allWorkstations ? "All Workstations" : "Assigned Workstations"}
            </div>
            <div style={styles.cardsGrid}>
              {displayWorkstations.map((item) => (
                <AssignmentCard
                  key={item.id}
                  item={item}
                  type="workstation"
                  onRemove={(removedItem) => {
                    if (allWorkstations) {
                      setAllWorkstations(false);
                      setSelectedWorkstations(
                        MOCK_WORKSTATIONS.filter((w) => w.id !== removedItem.id)
                      );
                    } else {
                      setSelectedWorkstations(
                        selectedWorkstations.filter(
                          (w) => w.id !== removedItem.id
                        )
                      );
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderGroups = () => {
    const displayGroups = allGroups ? MOCK_GROUPS : selectedGroups;

    return (
      <div style={styles.stepContent}>
        <SearchAutocomplete
          label="Assign Groups"
          placeholder="Search for groups"
          items={MOCK_GROUPS}
          suggestedItems={suggestedGroups}
          selectedItems={selectedGroups}
          onSelect={(item) => setSelectedGroups([...selectedGroups, item])}
          showAllCheckbox={true}
          allSelected={allGroups}
          onAllChange={(checked) => {
            setAllGroups(checked);
            if (checked) {
              setSelectedGroups([]);
            }
          }}
        />

        {(displayGroups.length > 0 || allGroups) && (
          <div style={styles.assignedSection}>
            <div style={styles.assignedLabel}>
              {allGroups ? "All Groups" : "Assigned Groups"}
            </div>
            <div style={styles.cardsGrid}>
              {displayGroups.map((item) => (
                <AssignmentCard
                  key={item.id}
                  item={item}
                  type="group"
                  onRemove={(removedItem) => {
                    if (allGroups) {
                      setAllGroups(false);
                      setSelectedGroups(
                        MOCK_GROUPS.filter((g) => g.id !== removedItem.id)
                      );
                    } else {
                      setSelectedGroups(
                        selectedGroups.filter((g) => g.id !== removedItem.id)
                      );
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFiles = () => {
    const displayFiles = allFiles ? MOCK_FILES : selectedFiles;

    return (
      <div style={styles.stepContent}>
        <SearchAutocomplete
          label="Assign Files"
          placeholder="Search for files"
          items={MOCK_FILES}
          suggestedItems={suggestedFiles}
          selectedItems={selectedFiles}
          onSelect={(item) => setSelectedFiles([...selectedFiles, item])}
          showAllCheckbox={true}
          allSelected={allFiles}
          onAllChange={(checked) => {
            setAllFiles(checked);
            if (checked) {
              setSelectedFiles([]);
            }
          }}
        />

        {(displayFiles.length > 0 || allFiles) && (
          <div style={styles.assignedSection}>
            <div style={styles.assignedLabel}>
              {allFiles ? "All Files" : "Assigned Files"}
            </div>
            <div style={styles.cardsGrid}>
              {displayFiles.map((item) => (
                <AssignmentCard
                  key={item.id}
                  item={item}
                  type="file"
                  onRemove={(removedItem) => {
                    if (allFiles) {
                      setAllFiles(false);
                      setSelectedFiles(
                        MOCK_FILES.filter((f) => f.id !== removedItem.id)
                      );
                    } else {
                      setSelectedFiles(
                        selectedFiles.filter((f) => f.id !== removedItem.id)
                      );
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
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
              currentStep={currentStep}
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
            {currentStep > 0 && (
              <button onClick={handleBack} style={styles.backButton}>
                ← Back
              </button>
            )}
          </div>

          <div style={styles.footerRight}>
            {currentStep === 0 && (
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

            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                style={{
                  ...styles.nextButton,
                  ...(canProceed() ? {} : styles.disabledButton),
                }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={submitForm}
                disabled={!canProceed()}
                style={{
                  ...styles.updateButton,
                  ...(canProceed() ? {} : styles.disabledButton),
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

const styles = {
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1300,
  },
  modalContainer: {
    width: "90%",
    maxWidth: "900px",
    maxHeight: "90vh",
    backgroundColor: "#1A1A1A",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#fff",
    boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    padding: "24px 32px",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    flexShrink: 0,
  },
  title: {
    fontSize: "1.3rem",
    fontWeight: 600,
    marginBottom: "4px",
  },
  closeButton: {
    background: "none",
    border: "none",
    color: "#fff",
    fontSize: "28px",
    cursor: "pointer",
    padding: "0",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "8px",
    transition: "background-color 0.2s",
    marginTop: "-4px",
  },
  content: {
    padding: "24px 32px",
    overflowY: "auto",
    flex: 1,
    minHeight: "400px",
  },
  stepContent: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "0.875rem",
    color: "rgba(255,255,255,0.7)",
    fontWeight: 500,
  },
  input: {
    backgroundColor: "#111",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "10px",
    padding: "12px 16px",
    color: "#fff",
    fontSize: "0.9rem",
    outline: "none",
    transition: "all 0.2s",
  },
  assignedSection: {
    marginTop: "8px",
  },
  assignedLabel: {
    fontSize: "0.875rem",
    color: "rgba(255,255,255,0.7)",
    fontWeight: 500,
    marginBottom: "12px",
  },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: "12px",
  },
  footer: {
    borderTop: "1px solid rgba(255,255,255,0.12)",
    padding: "20px 32px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexShrink: 0,
  },
  footerLeft: {
    display: "flex",
  },
  footerRight: {
    display: "flex",
    gap: "12px",
  },
  backButton: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.18)",
    color: "#fff",
    padding: "10px 24px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: 500,
    transition: "all 0.2s",
  },
  deleteButton: {
    background: "rgba(220,38,38,0.15)",
    border: "1px solid rgba(220,38,38,0.3)",
    color: "#DC2626",
    padding: "10px 24px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: 600,
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  nextButton: {
    background: "rgba(59,130,246,0.15)",
    border: "1px solid rgba(59,130,246,0.3)",
    color: "#3B82F6",
    padding: "10px 24px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: 600,
    transition: "all 0.2s",
  },
  updateButton: {
    background: "rgba(59,130,246,0.15)",
    border: "1px solid rgba(59,130,246,0.3)",
    color: "#3B82F6",
    padding: "10px 24px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: 600,
    transition: "all 0.2s",
  },
  disabledButton: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
};
