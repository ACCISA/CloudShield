import React, { useState, useEffect, useMemo } from "react";

import GroupsList from "../components/groups/GroupsList.jsx";

// Import dynamic components
import SearchField from "../components/common/SearchField/SearchField.jsx";
import CreateButton from "../components/common/CreateButton/CreateButton.jsx";
import RefreshButton from "../components/common/RefreshButton/RefreshButton.jsx";
import DisplayButton from "../components/common/DisplayButton/DisplayButton.jsx";
import FilterButton from "../components/common/FilterButton/FilterButton.jsx";
import CreateGroupIcon from "../assets/CreateGroupIcon.jsx";

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);

  const [search, setSearch] = useState("");
  const [layout, setLayout] = useState("list");

  // Filter state using Sets for FilterButton
  const [activeFilters, setActiveFilters] = useState({
    size: new Set(),
  });

  const [showUsers, setShowUsers] = useState(true);
  const [showWorkstations, setShowWorkstations] = useState(true);
  const [showFiles, setShowFiles] = useState(true);

  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const [toast, setToast] = useState({ open: false, msg: "", type: "success" });

  const openToast = (msg, type = "success") =>
    setToast({ open: true, msg, type });

  const mockFetchGroups = async () => {
    const mock = [
      {
        id: "1",
        name: "Sales Team",
        groupName: "Sales Team",
        description: "Sales Reps & Account Manager",
        memberCount: 8,
        users: [
          {
            firstName: "Jim",
            lastName: "Halpert",
            active: true,
            title: "Sales Representative",
            email: "jim@dundermifflin.com",
          },
          {
            firstName: "Dwight",
            lastName: "Schrute",
            active: true,
            title: "Assistant Regional Manager",
            email: "dwight@dundermifflin.com",
          },
          {
            firstName: "Stanley",
            lastName: "Hudson",
            active: true,
            title: "Sales Representative",
            email: "stanley@dundermifflin.com",
          },
          {
            firstName: "Phyllis",
            lastName: "Vance",
            active: true,
            title: "Sales Representative",
            email: "phyllis@dundermifflin.com",
          },
          {
            firstName: "Andy",
            lastName: "Bernard",
            active: false,
            title: "Sales Representative",
            email: "andy@dundermifflin.com",
          },
        ],
        workstations: [
          {
            name: "Sales-WS-001",
            hostname: "SALES-WS-001",
            online: true,
            ipAddress: "192.168.1.101",
          },
          {
            name: "Sales-WS-002",
            hostname: "SALES-WS-002",
            online: true,
            ipAddress: "192.168.1.102",
          },
          {
            name: "Sales-WS-003",
            hostname: "SALES-WS-003",
            online: false,
            ipAddress: "192.168.1.103",
          },
        ],
        files: 24,
        type: "Department",
        createdDate: "2025-01-10T00:00:00Z",
      },
      {
        id: "2",
        name: "Engineering",
        groupName: "Engineering",
        description: "Software development team",
        memberCount: 12,
        users: [
          {
            firstName: "Michael",
            lastName: "Scott",
            active: true,
            title: "Regional Manager",
            email: "michael@dundermifflin.com",
            profileImage: "https://i.pravatar.cc/150?img=12",
          },
          {
            firstName: "Pam",
            lastName: "Beasly",
            active: true,
            title: "Receptionist",
            email: "pam@dundermifflin.com",
          },
          {
            firstName: "Ryan",
            lastName: "Howard",
            active: true,
            title: "Temp",
            email: "ryan@dundermifflin.com",
          },
          {
            firstName: "Kelly",
            lastName: "Kapoor",
            active: true,
            title: "Customer Service",
            email: "kelly@dundermifflin.com",
          },
          {
            firstName: "Oscar",
            lastName: "Martinez",
            active: true,
            title: "Accountant",
            email: "oscar@dundermifflin.com",
          },
          {
            firstName: "Angela",
            lastName: "Martin",
            active: true,
            title: "Senior Accountant",
            email: "angela@dundermifflin.com",
          },
        ],
        workstations: [
          {
            name: "ENG-WS-001",
            hostname: "ENG-WS-001",
            online: true,
            ipAddress: "192.168.2.101",
          },
          {
            name: "ENG-WS-002",
            hostname: "ENG-WS-002",
            online: true,
            ipAddress: "192.168.2.102",
          },
          {
            name: "ENG-WS-003",
            hostname: "ENG-WS-003",
            online: true,
            ipAddress: "192.168.2.103",
          },
          {
            name: "ENG-WS-004",
            hostname: "ENG-WS-004",
            online: false,
            ipAddress: "192.168.2.104",
          },
        ],
        files: 156,
        type: "Department",
        createdDate: "2025-02-15T00:00:00Z",
        profileImage: "https://i.pravatar.cc/150?img=68",
      },
      {
        id: "3",
        name: "Marketing",
        groupName: "Marketing",
        description: "Marketing and communications",
        memberCount: 6,
        users: [
          {
            firstName: "Toby",
            lastName: "Flenderson",
            active: true,
            title: "HR Representative",
            email: "toby@dundermifflin.com",
          },
          {
            firstName: "Creed",
            lastName: "Bratton",
            active: true,
            title: "Quality Assurance",
            email: "creed@dundermifflin.com",
          },
          {
            firstName: "Meredith",
            lastName: "Palmer",
            active: false,
            title: "Supplier Relations",
            email: "meredith@dundermifflin.com",
          },
        ],
        workstations: [
          {
            name: "MKT-WS-001",
            hostname: "MKT-WS-001",
            online: true,
            ipAddress: "192.168.3.101",
          },
          {
            name: "MKT-WS-002",
            hostname: "MKT-WS-002",
            online: true,
            ipAddress: "192.168.3.102",
          },
        ],
        files: 89,
        type: "Department",
        createdDate: "2025-03-20T00:00:00Z",
      },
      {
        id: "4",
        name: "HR Department",
        groupName: "HR Department",
        description: "Human Resources team",
        memberCount: 4,
        users: [
          {
            firstName: "Kevin",
            lastName: "Malone",
            active: true,
            title: "Accountant",
            email: "kevin@dundermifflin.com",
          },
          {
            firstName: "Erin",
            lastName: "Hannon",
            active: true,
            title: "Receptionist",
            email: "erin@dundermifflin.com",
          },
        ],
        workstations: [
          {
            name: "HR-WS-001",
            hostname: "HR-WS-001",
            online: false,
            ipAddress: "192.168.4.101",
          },
        ],
        files: 42,
        type: "Department",
        createdDate: "2025-01-05T00:00:00Z",
      },
    ];
    setGroups(mock);
  };

  useEffect(() => {
    mockFetchGroups();
  }, []);

  const filtered = useMemo(() => {
    let out = [...groups];
    const q = search.trim().toLowerCase();

    if (q) {
      out = out.filter((g) =>
        [g.name, g.description].some((v) => v.toLowerCase().includes(q))
      );
    }

    // Apply size filters (if needed)
    const sizeFilters = activeFilters.size;
    if (sizeFilters.size > 0) {
      out = out.filter((g) => {
        if (sizeFilters.has("small") && g.users <= 5) return true;
        if (sizeFilters.has("medium") && g.users > 5 && g.users <= 20)
          return true;
        if (sizeFilters.has("large") && g.users > 20) return true;
        return false;
      });
    }

    out.sort((a, b) => {
      const va = a[sortField] ?? "";
      const vb = b[sortField] ?? "";

      if (typeof va === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });

    return out;
  }, [groups, search, activeFilters, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // Filter configuration for FilterButton
  const filterGroups = [
    {
      id: "size",
      label: "Group Size",
      type: "checkbox",
      options: [
        { value: "small", label: "Small (≤5)" },
        { value: "medium", label: "Medium (6-20)" },
        { value: "large", label: "Large (>20)" },
      ],
    },
  ];

  const handleFilterChange = (groupId, value, isActive) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev };
      const currentSet = new Set(newFilters[groupId] || []);

      if (isActive) {
        currentSet.add(value);
      } else {
        currentSet.delete(value);
      }

      newFilters[groupId] = currentSet;
      return newFilters;
    });
  };

  const handleMockDelete = (id) => {
    setGroups((p) => p.filter((g) => g.id !== id));
    openToast("Group deleted");
  };

  const styles = {
    container: {
      display: "flex",
      flexDirection: "column",
    },
    toolbar: {
      display: "flex",
      justifyContent: "space-between",
      gap: "12px",
      flexWrap: "wrap",
    },
    leftActions: {
      display: "flex",
      gap: "10px",
      flex: "1 1 auto",
      flexWrap: "wrap",
    },
    rightActions: {
      display: "flex",
      gap: "10px",
    },
  };

  return (
    <div style={styles.container}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        {/* Left side: Search and buttons */}
        <div style={styles.leftActions}>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search groups"
            width="420px"
            showIcon={true}
            style={{
              flex: "1 1 260px",
              minWidth: "260px",
              maxWidth: "680px",
            }}
          />

          <DisplayButton layout={layout} onLayoutChange={setLayout} />

          <FilterButton
            filterGroups={filterGroups}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Right side: Refresh and Create buttons */}
        <div style={styles.rightActions}>
          <RefreshButton onClick={mockFetchGroups} />

          <CreateButton
            icon={<CreateGroupIcon width={24} height={24} color="#fff" />}
            buttonText="Create"
            onClick={() => {}}
          />
        </div>
      </div>

      <GroupsList
        rows={filtered}
        showUsers={showUsers}
        showWorkstations={showWorkstations}
        showFiles={showFiles}
        onEdit={(g) => {}}
        onDelete={(g) => handleMockDelete(g.id)}
      />
    </div>
  );
}
