import React from "react";

export default function AssignmentSection({
  title,
  items,
  placeholder,
}) {
  return (
    <div className="section">
      <div className="sectionHeader">
        <span>{title}</span>
        <label><input type="checkbox" /> All {title.toLowerCase()}</label>
      </div>

      <input placeholder={placeholder} />
      <div className="suggested">suggested</div>

      <div className="chips">
        {items.map((item) => (
          <label key={item}>
            <input type="checkbox" /> {item}
          </label>
        ))}
      </div>
    </div>
  );
}
