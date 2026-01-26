import React from "react";
import { Autocomplete, TextField, Chip } from "@mui/material";

/**
 * Reusable multi-select component for assigning users or groups to file shares.
 * Uses MUI Autocomplete with search/filter functionality and chip-based display.
 * 
 * @param {string} title - Section header (e.g., "Assign Users")
 * @param {string[]} items - Available options to select from
 * @param {string} placeholder - Input placeholder text
 * @param {string[]} selectedItems - Currently selected options
 * @param {function} onSelectionChange - Callback when selection changes
 */
export default function AssignmentSection({
  title,
  items,
  placeholder,
  selectedItems = [],
  onSelectionChange,
}) {
  return (
    <div className="section">
      <div className="sectionHeader">
        <span>{title}</span>
      </div>

      <Autocomplete
        multiple
        options={items}
        value={selectedItems}
        onChange={(event, newValue) => {
          onSelectionChange(newValue);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            placeholder={selectedItems.length === 0 ? placeholder : ""}
            size="small"
          />
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              {...getTagProps({ index })}
              key={option}
              label={option}
              size="small"
            />
          ))
        }
        sx={{
          '& .MuiOutlinedInput-root': {
            padding: '4px',
          },
        }}
      />
    </div>
  );
}
