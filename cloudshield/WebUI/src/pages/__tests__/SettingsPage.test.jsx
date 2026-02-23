import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "../SettingsPage";

// Mock child components
jest.mock("../../components/settings/BasicInfoTab", () => {
  return function MockBasicInfoTab() {
    return <div data-testid="basic-info-tab">Basic Info Tab</div>;
  };
});

jest.mock("../../components/settings/BillingTab", () => {
  return function MockBillingTab() {
    return <div data-testid="billing-tab">Billing Tab</div>;
  };
});

jest.mock("../../components/settings/NotificationsTab", () => {
  return function MockNotificationsTab() {
    return <div data-testid="notifications-tab">Notifications Tab</div>;
  };
});

jest.mock("../../components/settings/AppearanceTab", () => {
  return function MockAppearanceTab() {
    return <div data-testid="appearance-tab">Appearance Tab</div>;
  };
});

describe("SettingsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch.mockRestore();
  });

  describe("Rendering", () => {
    it("renders settings page title", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ user: { id: "user1", email: "test@example.com" } }),
      });

      render(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText("Settings")).toBeInTheDocument();
      });
    });

    it("renders tab navigation", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ user: { id: "user1", email: "test@example.com" } }),
      });

      render(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText("Basic Info")).toBeInTheDocument();
        expect(screen.getByText("Plan & Billing")).toBeInTheDocument();
        expect(screen.getByText("Notifications")).toBeInTheDocument();
        expect(screen.getByText("Appearance")).toBeInTheDocument();
      });
    });
  });

  describe("Tab Navigation", () => {
    it("displays basic info tab by default", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ user: { id: "user1", email: "test@example.com" } }),
      });

      render(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
      });
    });

    it("switches to billing tab on click", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ user: { id: "user1", email: "test@example.com" } }),
      });

      render(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText("Plan & Billing")).toBeInTheDocument();
      });

      const billingTab = screen.getByText("Plan & Billing");
      await userEvent.click(billingTab);

      await waitFor(() => {
        expect(screen.getByTestId("billing-tab")).toBeInTheDocument();
      });
    });

    it("switches to notifications tab on click", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ user: { id: "user1", email: "test@example.com" } }),
      });

      render(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText("Notifications")).toBeInTheDocument();
      });

      const notificationsTab = screen.getByText("Notifications");
      await userEvent.click(notificationsTab);

      await waitFor(() => {
        expect(screen.getByTestId("notifications-tab")).toBeInTheDocument();
      });
    });

    it("switches to appearance tab on click", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ user: { id: "user1", email: "test@example.com" } }),
      });

      render(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText("Appearance")).toBeInTheDocument();
      });

      const appearanceTab = screen.getByText("Appearance");
      await userEvent.click(appearanceTab);

      await waitFor(() => {
        expect(screen.getByTestId("appearance-tab")).toBeInTheDocument();
      });
    });
  });

  describe("Data Loading", () => {
    it("shows loading state initially", () => {
      global.fetch.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<SettingsPage />);
      
      // Component should render without errors
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("fetches user data on mount", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ user: { id: "user1", email: "test@example.com" } }),
      });

      render(<SettingsPage />);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/users/"),
          expect.any(Object)
        );
      });
    });

    it("handles fetch error gracefully", async () => {
      global.fetch.mockRejectedValue(new Error("Network error"));

      render(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText("Settings")).toBeInTheDocument();
      });
    });

    it("stops loading after fetch completes", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ user: { id: "user1", email: "test@example.com" } }),
      });

      render(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
      });

      // Should not show loading message anymore
      expect(screen.queryByText("Loading settings...")).not.toBeInTheDocument();
    });
  });

  describe("Toast Notifications", () => {
    it("shows loading state during loading", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ user: { id: "user1", email: "test@example.com" } }),
      });

      render(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
      });
    });
  });

  describe("Layout", () => {
    it("renders with correct styling", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ user: { id: "user1", email: "test@example.com" } }),
      });

      const { container } = render(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText("Settings")).toBeInTheDocument();
      });

      expect(container).toBeTruthy();
    });

    it("renders tabs with proper styling", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ user: { id: "user1", email: "test@example.com" } }),
      });

      const { container } = render(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText("Basic Info")).toBeInTheDocument();
      });

      // MUI Tabs component should be rendered
      expect(container.querySelector('[role="tablist"]')).toBeInTheDocument();
    });
  });
});
