import { useState } from "react";

/**
 * Custom hook for managing user form state
 * Used by both UserCreateModal and UserEditModal
 */
export function useUserForm(initialData = {}) {
  // Step management
  const [currentStep, setCurrentStep] = useState(0);

  // Form data
  const [firstName, setFirstName] = useState(initialData.firstName || "");
  const [lastName, setLastName] = useState(initialData.lastName || "");
  const [email, setEmail] = useState(initialData.email || "");
  const [title, setTitle] = useState(initialData.title || "");
  const [profileImage, setProfileImage] = useState(
    initialData.profileImage || null
  );

  // Assignments
  const [selectedWorkstations, setSelectedWorkstations] = useState(
    initialData.workstations || []
  );
  const [allWorkstations, setAllWorkstations] = useState(
    initialData.allWorkstations || false
  );
  const [selectedGroups, setSelectedGroups] = useState(
    initialData.groups || []
  );
  const [allGroups, setAllGroups] = useState(initialData.allGroups || false);
  const [selectedFiles, setSelectedFiles] = useState(initialData.files || []);
  const [allFiles, setAllFiles] = useState(initialData.allFiles || false);

  const resetForm = () => {
    setCurrentStep(0);
    setFirstName("");
    setLastName("");
    setEmail("");
    setTitle("");
    setProfileImage(null);
    setSelectedWorkstations([]);
    setAllWorkstations(false);
    setSelectedGroups([]);
    setAllGroups(false);
    setSelectedFiles([]);
    setAllFiles(false);
  };

  const canProceed = (step) => {
    switch (step) {
      case 0: // Basic Info
        return (
          firstName.trim() && lastName.trim() && email.trim() && title.trim()
        );
      case 1: // Workstations
        return allWorkstations || selectedWorkstations.length > 0;
      case 2: // Groups
        return allGroups || selectedGroups.length > 0;
      case 3: // Files
        return allFiles || selectedFiles.length > 0;
      default:
        return false;
    }
  };

  const getPayload = () => ({
    firstName,
    lastName,
    email,
    jobTitle: title,
    profileImage,
    workstations: allWorkstations ? "all" : selectedWorkstations,
    groups: allGroups ? "all" : selectedGroups,
    files: allFiles ? "all" : selectedFiles,
  });

  return {
    currentStep,
    setCurrentStep,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    email,
    setEmail,
    title,
    setTitle,
    profileImage,
    setProfileImage,
    selectedWorkstations,
    setSelectedWorkstations,
    allWorkstations,
    setAllWorkstations,
    selectedGroups,
    setSelectedGroups,
    allGroups,
    setAllGroups,
    selectedFiles,
    setSelectedFiles,
    allFiles,
    setAllFiles,
    resetForm,
    canProceed,
    getPayload,
  };
}
