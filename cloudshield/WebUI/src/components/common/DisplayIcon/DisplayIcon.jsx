import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import "./DisplayIcon.css";

/**
 * DisplayIcon Component
 * A reusable component for displaying workstations, employees, and groups
 *
 * @param {Object} props
 * @param {string} props.type - Type of item: 'workstation', 'user', or 'group'
 * @param {Object} props.data - Data object from backend containing item details
 * @param {string} props.size - Size of icon: 'small' (32px), 'medium' (48px), 'large' (64px)
 * @param {boolean} props.showHoverCard - Whether to show the detailed hover card (default: true)
 */
function DisplayIcon({ type = "user", data = {}, size = "medium", showHoverCard = true }) {
  const [showCard, setShowCard] = useState(false);
  const [cardPosition, setCardPosition] = useState({ top: 0, left: 0 });
  const wrapperRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  const handleMouseEnter = () => {
    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (showHoverCard && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const cardWidth = 280;
      const cardHeight = 200; // approximate
      const spacing = 8;

      // Calculate horizontal position (try to center, but adjust if too close to edges)
      let left = rect.left + rect.width / 2 - cardWidth / 2;
      if (left < 10) left = 10; // Min 10px from left edge
      if (left + cardWidth > window.innerWidth - 10) {
        left = window.innerWidth - cardWidth - 10; // Max 10px from right edge
      }

      // Calculate vertical position (below icon, or above if not enough space)
      let top = rect.bottom + spacing;
      if (top + cardHeight > window.innerHeight - 10) {
        // Not enough space below, show above
        top = rect.top - cardHeight - spacing;
      }

      setCardPosition({ top, left });
      setShowCard(true);
    }
  };

  const handleMouseLeave = () => {
    // Delay hiding to allow moving to the card
    if (showHoverCard) {
      hideTimeoutRef.current = setTimeout(() => {
        setShowCard(false);
      }, 100);
    }
  };

  // Extract name based on type
  const getName = () => {
    if (type === "workstation") {
      return (
        data.name ||
        data.workstationName ||
        data.hostname ||
        "Unknown Workstation"
      );
    } else if (type === "user") {
      return (
        `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
        data.name ||
        data.username ||
        "Unknown User"
      );
    } else if (type === "group") {
      return data.name || data.groupName || "Unknown Group";
    }
    return "Unknown";
  };

  // Generate initials from name
  const getInitials = () => {
    const name = getName();
    const words = name.split(" ").filter((word) => word.length > 0);

    if (words.length >= 2) {
      return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
    } else if (words.length === 1 && words[0].length > 0) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return "??";
  };

  // Get profile image URL if available
  const getProfileImage = () => {
    return (
      data.profileImage ||
      data.profilePicture ||
      data.avatar ||
      data.image ||
      data.group_image ||
      null
    );
  };

  // Get background color based on type and data
  const getBackgroundColor = () => {
    if (data.color) return data.color;

    // Default colors by type
    const colors = {
      workstation: "#4A90E2",
      user: "#7B68EE",
      group: "#50C878",
    };
    return colors[type] || "#6B7280";
  };

  const profileImage = getProfileImage();
  const initials = getInitials();
  const name = getName();

  const hoverCard = showHoverCard && showCard && (
    <div 
      className="display-icon-card"
      style={{
        top: `${cardPosition.top}px`,
        left: `${cardPosition.left}px`,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {type === "user" && (
        <UserCard
          data={data}
          name={name}
          profileImage={profileImage}
          initials={initials}
          getBackgroundColor={getBackgroundColor}
        />
      )}
      {type === "workstation" && (
        <WorkstationCard
          data={data}
          name={name}
          profileImage={profileImage}
          initials={initials}
          getBackgroundColor={getBackgroundColor}
        />
      )}
      {type === "group" && (
        <GroupCard
          data={data}
          name={name}
          profileImage={profileImage}
          initials={initials}
          getBackgroundColor={getBackgroundColor}
        />
      )}
    </div>
  );

  return (
    <>
      <div
        ref={wrapperRef}
        className="display-icon-wrapper"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className={`display-icon display-icon-${size}`}>
          {profileImage ? (
            <img src={profileImage} alt={name} className="display-icon-image" />
          ) : (
            <div
              className="display-icon-initials"
              style={{ backgroundColor: getBackgroundColor() }}
            >
              {initials}
            </div>
          )}
        </div>
      </div>

      {hoverCard && createPortal(hoverCard, document.body)}
    </>
  );
}

// User hover card component
function UserCard({ data, name, profileImage, initials, getBackgroundColor }) {
  const isActive =
    data.active !== undefined
      ? data.active
      : data.isActive !== undefined
      ? data.isActive
      : true;

  return (
    <div className="hover-card">
      <div className="hover-card-header">
        <div className={`hover-card-icon display-icon-small`}>
          {profileImage ? (
            <img src={profileImage} alt={name} className="display-icon-image" />
          ) : (
            <div
              className="display-icon-initials"
              style={{ backgroundColor: getBackgroundColor() }}
            >
              {initials}
            </div>
          )}
        </div>
        <div className="hover-card-title">
          <h4>{name}</h4>
          <span className={`status-badge ${isActive ? "active" : "inactive"}`}>
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>
      <div className="hover-card-details">
        {(data.role || data.title) && (
          <div className="detail-row">
            <span className="detail-label">Role:</span>
            <span className="detail-value">{data.role || data.title}</span>
          </div>
        )}
        {data.email && (
          <div className="detail-row">
            <span className="detail-label">Email:</span>
            <span className="detail-value">{data.email}</span>
          </div>
        )}
        {data.username && (
          <div className="detail-row">
            <span className="detail-label">Username:</span>
            <span className="detail-value">{data.username}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Workstation hover card component
function WorkstationCard({
  data,
  name,
  profileImage,
  initials,
  getBackgroundColor,
}) {
  const isOnline =
    data.online !== undefined
      ? data.online
      : data.isOnline !== undefined
      ? data.isOnline
      : data.status === "online";

  return (
    <div className="hover-card">
      <div className="hover-card-header">
        <div className={`hover-card-icon display-icon-small`}>
          {profileImage ? (
            <img src={profileImage} alt={name} className="display-icon-image" />
          ) : (
            <div
              className="display-icon-initials"
              style={{ backgroundColor: getBackgroundColor() }}
            >
              {initials}
            </div>
          )}
        </div>
        <div className="hover-card-title">
          <h4>{name}</h4>
          <span className={`status-badge ${isOnline ? "active" : "inactive"}`}>
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>
      <div className="hover-card-details">
        {data.hostname && (
          <div className="detail-row">
            <span className="detail-label">Hostname:</span>
            <span className="detail-value">{data.hostname}</span>
          </div>
        )}
        {data.ipAddress && (
          <div className="detail-row">
            <span className="detail-label">IP Address:</span>
            <span className="detail-value">{data.ipAddress}</span>
          </div>
        )}
        {data.operatingSystem && (
          <div className="detail-row">
            <span className="detail-label">OS:</span>
            <span className="detail-value">{data.operatingSystem}</span>
          </div>
        )}
        {data.assignedUser && (
          <div className="detail-row">
            <span className="detail-label">Assigned User:</span>
            <span className="detail-value">{data.assignedUser}</span>
          </div>
        )}
        {data.lastSeen && (
          <div className="detail-row">
            <span className="detail-label">Last Seen:</span>
            <span className="detail-value">
              {new Date(data.lastSeen).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Group hover card component
function GroupCard({ data, name, profileImage, initials, getBackgroundColor }) {
  return (
    <div className="hover-card">
      <div className="hover-card-header">
        <div className={`hover-card-icon display-icon-small`}>
          {profileImage ? (
            <img src={profileImage} alt={name} className="display-icon-image" />
          ) : (
            <div
              className="display-icon-initials"
              style={{ backgroundColor: getBackgroundColor() }}
            >
              {initials}
            </div>
          )}
        </div>
        <div className="hover-card-title">
          <h4>{name}</h4>
        </div>
      </div>
      <div className="hover-card-details">
        {(data.member_count !== undefined || data.memberCount !== undefined) && (
          <div className="detail-row">
            <span className="detail-label">Members:</span>
            <span className="detail-value">
              {data.member_count !== undefined ? data.member_count : data.memberCount}
            </span>
          </div>
        )}
        {data.description && (
          <div className="detail-row">
            <span className="detail-label">Description:</span>
            <span className="detail-value">{data.description}</span>
          </div>
        )}
        {(data.created_at || data.createdDate) && (
          <div className="detail-row">
            <span className="detail-label">Created:</span>
            <span className="detail-value">
              {new Date(data.created_at || data.createdDate).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default DisplayIcon;
