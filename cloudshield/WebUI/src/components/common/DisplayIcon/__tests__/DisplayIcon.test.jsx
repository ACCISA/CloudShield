import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import DisplayIcon from "../DisplayIcon";

describe("DisplayIcon Component", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe("User Type", () => {
    const userData = {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      title: "Software Engineer",
      department: "Engineering",
      username: "jdoe",
      active: true,
    };

    test("renders user with initials", () => {
      render(<DisplayIcon type="user" data={userData} />);
      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    test("renders user with profile image", () => {
      const dataWithImage = { ...userData, profileImage: "/path/to/image.jpg" };
      const { container } = render(
        <DisplayIcon type="user" data={dataWithImage} />,
      );
      const img = container.querySelector("img");
      expect(img).toHaveAttribute("src", "/path/to/image.jpg");
    });

    test("shows hover card on mouse enter", () => {
      const { container } = render(<DisplayIcon type="user" data={userData} />);
      const wrapper = container.querySelector(".display-icon-wrapper");

      fireEvent.mouseEnter(wrapper);
      expect(screen.getByText("john.doe@example.com")).toBeInTheDocument();
      expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    });

    test("hides hover card on mouse leave", () => {
      const { container } = render(<DisplayIcon type="user" data={userData} />);
      const wrapper = container.querySelector(".display-icon-wrapper");

      fireEvent.mouseEnter(wrapper);
      expect(screen.getByText("john.doe@example.com")).toBeInTheDocument();

      fireEvent.mouseLeave(wrapper);
      act(() => {
        jest.advanceTimersByTime(150);
      });
      expect(screen.queryByText("john.doe@example.com")).not.toBeInTheDocument();
    });

    test("displays active status badge", () => {
      render(<DisplayIcon type="user" data={userData} />);
      const { container } = render(<DisplayIcon type="user" data={userData} />);
      const wrapper = container.querySelector(".display-icon-wrapper");

      fireEvent.mouseEnter(wrapper);
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    test("displays inactive status badge", () => {
      const inactiveUser = { ...userData, active: false };
      const { container } = render(
        <DisplayIcon type="user" data={inactiveUser} />,
      );
      const wrapper = container.querySelector(".display-icon-wrapper");

      fireEvent.mouseEnter(wrapper);
      expect(screen.getByText("Inactive")).toBeInTheDocument();
    });

    test("handles missing name data", () => {
      render(<DisplayIcon type="user" data={{}} />);
      // "Unknown User" generates "UU" initials
      expect(screen.getByText("UU")).toBeInTheDocument();
    });

    test("generates initials from single name", () => {
      render(<DisplayIcon type="user" data={{ firstName: "John" }} />);
      expect(screen.getByText("JO")).toBeInTheDocument();
    });
  });

  describe("Workstation Type", () => {
    const workstationData = {
      name: "Dev Workstation",
      hostname: "dev-ws-01",
      ipAddress: "192.168.1.100",
      operatingSystem: "Ubuntu 22.04",
      assignedUser: "John Doe",
      online: true,
      lastSeen: "2024-01-24T10:00:00Z",
    };

    test("renders workstation with initials", () => {
      render(<DisplayIcon type="workstation" data={workstationData} />);
      expect(screen.getByText("DW")).toBeInTheDocument();
    });

    test("shows hover card with workstation details", () => {
      const { container } = render(
        <DisplayIcon type="workstation" data={workstationData} />,
      );
      const wrapper = container.querySelector(".display-icon-wrapper");

      fireEvent.mouseEnter(wrapper);
      expect(screen.getByText("dev-ws-01")).toBeInTheDocument();
      expect(screen.getByText("192.168.1.100")).toBeInTheDocument();
      expect(screen.getByText("Ubuntu 22.04")).toBeInTheDocument();
    });

    test("displays online status badge", () => {
      const { container } = render(
        <DisplayIcon type="workstation" data={workstationData} />,
      );
      const wrapper = container.querySelector(".display-icon-wrapper");

      fireEvent.mouseEnter(wrapper);
      expect(screen.getByText("Online")).toBeInTheDocument();
    });

    test("displays offline status badge", () => {
      const offlineData = { ...workstationData, online: false };
      const { container } = render(
        <DisplayIcon type="workstation" data={offlineData} />,
      );
      const wrapper = container.querySelector(".display-icon-wrapper");

      fireEvent.mouseEnter(wrapper);
      expect(screen.getByText("Offline")).toBeInTheDocument();
    });

    test("handles status from status field", () => {
      const statusData = {
        ...workstationData,
        online: undefined,
        status: "online",
      };
      const { container } = render(
        <DisplayIcon type="workstation" data={statusData} />,
      );
      const wrapper = container.querySelector(".display-icon-wrapper");

      fireEvent.mouseEnter(wrapper);
      expect(screen.getByText("Online")).toBeInTheDocument();
    });
  });

  describe("Group Type", () => {
    const groupData = {
      name: "Engineering Team",
      description: "All engineering staff",
      memberCount: 25,
      createdDate: "2024-01-01T00:00:00Z",
    };

    test("renders group with initials", () => {
      render(<DisplayIcon type="group" data={groupData} />);
      expect(screen.getByText("ET")).toBeInTheDocument();
    });

    test("shows hover card with group details", () => {
      const { container } = render(
        <DisplayIcon type="group" data={groupData} />,
      );
      const wrapper = container.querySelector(".display-icon-wrapper");

      fireEvent.mouseEnter(wrapper);
      expect(screen.getByText("All engineering staff")).toBeInTheDocument();
      expect(screen.getByText("25")).toBeInTheDocument();
    });

    test("uses groupName if name is not available", () => {
      const data = { groupName: "Test Group" };
      render(<DisplayIcon type="group" data={data} />);
      expect(screen.getByText("TG")).toBeInTheDocument();
    });
  });

  describe("Size Variants", () => {
    const testData = { firstName: "Test", lastName: "User" };

    test("renders small size", () => {
      const { container } = render(
        <DisplayIcon type="user" data={testData} size="small" />,
      );
      expect(
        container.querySelector(".display-icon-small"),
      ).toBeInTheDocument();
    });

    test("renders medium size (default)", () => {
      const { container } = render(<DisplayIcon type="user" data={testData} />);
      expect(
        container.querySelector(".display-icon-medium"),
      ).toBeInTheDocument();
    });

    test("renders large size", () => {
      const { container } = render(
        <DisplayIcon type="user" data={testData} size="large" />,
      );
      expect(
        container.querySelector(".display-icon-large"),
      ).toBeInTheDocument();
    });
  });

  describe("Custom Colors", () => {
    test("uses custom color from data", () => {
      const data = { firstName: "John", lastName: "Doe", color: "#FF0000" };
      const { container } = render(<DisplayIcon type="user" data={data} />);
      const initials = container.querySelector(".display-icon-initials");
      expect(initials).toHaveStyle({ backgroundColor: "#FF0000" });
    });

    test("uses default color for user type", () => {
      const data = { firstName: "John", lastName: "Doe" };
      const { container } = render(<DisplayIcon type="user" data={data} />);
      const initials = container.querySelector(".display-icon-initials");
      expect(initials).toHaveStyle({ backgroundColor: "#7B68EE" });
    });

    test("uses default color for workstation type", () => {
      const data = { name: "Workstation" };
      const { container } = render(
        <DisplayIcon type="workstation" data={data} />,
      );
      const initials = container.querySelector(".display-icon-initials");
      expect(initials).toHaveStyle({ backgroundColor: "#4A90E2" });
    });

    test("uses default color for group type", () => {
      const data = { name: "Group" };
      const { container } = render(<DisplayIcon type="group" data={data} />);
      const initials = container.querySelector(".display-icon-initials");
      expect(initials).toHaveStyle({ backgroundColor: "#50C878" });
    });
  });

  describe("Edge Cases", () => {
    test("handles empty data object", () => {
      render(<DisplayIcon type="user" data={{}} />);
      // "Unknown User" generates "UU" initials
      expect(screen.getByText("UU")).toBeInTheDocument();
    });

    test("handles alternative profile image fields", () => {
      const dataWithAvatar = { firstName: "John", avatar: "/avatar.jpg" };
      const { container } = render(
        <DisplayIcon type="user" data={dataWithAvatar} />,
      );
      const img = container.querySelector("img");
      expect(img).toHaveAttribute("src", "/avatar.jpg");
    });

    test("handles alternative name fields for workstation", () => {
      const data = { workstationName: "WS-001" };
      render(<DisplayIcon type="workstation" data={data} />);
      expect(screen.getByText("WS")).toBeInTheDocument();
    });

    test("handles isActive field for users", () => {
      const data = { firstName: "John", lastName: "Doe", isActive: false };
      const { container } = render(<DisplayIcon type="user" data={data} />);
      const wrapper = container.querySelector(".display-icon-wrapper");

      fireEvent.mouseEnter(wrapper);
      expect(screen.getByText("Inactive")).toBeInTheDocument();
    });

    test("handles isOnline field for workstations", () => {
      const data = { name: "WS-001", isOnline: true };
      const { container } = render(
        <DisplayIcon type="workstation" data={data} />,
      );
      const wrapper = container.querySelector(".display-icon-wrapper");

      fireEvent.mouseEnter(wrapper);
      expect(screen.getByText("Online")).toBeInTheDocument();
    });
  });
});
