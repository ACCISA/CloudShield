import ProfilePictureUpload from "../ProfilePictureUpload";
import SearchAutocomplete from "../SearchAutocomplete";
import AssignmentCard from "../AssignmentCard";
import { MOCK_WORKSTATIONS, MOCK_GROUPS, MOCK_FILES } from "./userModalData";

/**
 * Shared step components for user modals
 */

export function BasicInfoStep({
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
  styles,
}) {
  return (
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
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Email</label>
        <input
          type="email"
          placeholder="johndoe@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Job Title</label>
        <input
          type="text"
          placeholder="Software Engineer"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={styles.input}
        />
      </div>
    </div>
  );
}

export function WorkstationsStep({
  selectedWorkstations,
  setSelectedWorkstations,
  allWorkstations,
  setAllWorkstations,
  suggestedWorkstations,
  styles,
}) {
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
}

export function GroupsStep({
  selectedGroups,
  setSelectedGroups,
  allGroups,
  setAllGroups,
  suggestedGroups,
  styles,
}) {
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
}

export function FilesStep({
  selectedFiles,
  setSelectedFiles,
  allFiles,
  setAllFiles,
  suggestedFiles,
  styles,
}) {
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
}
