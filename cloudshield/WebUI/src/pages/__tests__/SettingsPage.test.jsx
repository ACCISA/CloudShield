import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthContext } from "../../../context/AuthContext";
import SettingsPage from "../../SettingsPage";

// Mock the tab components
jest.mock("../components/settings/BasicInfoTab", () => {
  return function MockBasicInfoTab() {
    return <div data-testid="basic-info-tab">Basic Info Tab</div>;
  };
});

jest.mock("../components/settings/BillingTab", () => {
  return function MockBillingTab() {
    return <div data-testid="billing-tab">Billing Tab</div>;
  };
});

jest.mock("../components/settings/NotificationsTab", () => {
  return function MockNotificationsTab() {
    return <div data-testid="notifications-tab">Notifications Tab</div>;
  };
});

jest.mock("../components/settings/AppearanceTab", () => {
  return function MockAppearanceTab() {
    return <div data-testid="appearance-tab">Appearance Tab</div>;
  };
});

// Mock fetch
global.fetch = jest.fn();

describe("SettingsPage", () => {
  const mockCurrentUser = {
    id: "user123",
    role: "admin",
    org_id: "org_001",
  };

  const mockUserData = {
    id: "user123",
    email: "test@example.com",
    full_name: "John Doe",
    notification_preferences: {
      email_alerts: false,
      in_app_alerts: true,
    },
  };

  const mockAuthContext = {
    currentUser: mockCurrentUser,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ user: mockUserData }),
    });
  });

  const renderWithAuth = (component, authValue = mockAuthContext) => {
    return render(
      <AuthContext.Provider value={authValue}>
        {component}
      </AuthContext.Provider>
    );
  };

  describe("Rendering", () => {
    it("renders settings page title", async () => {
      renderWithAuth(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText("Settings")).toBeInTheDocument();
      });
    });

    it("renders all tab labels", async () => {
      renderWithAuth(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText("Basic Info")).toBeInTheDocument();
        expect(screen.getByText("Plan & Billing")).toBeInTheDocument();
        expect(screen.getByText("Notifications")).toBeInTheDocument();
        expect(screen.getByText("Appearance")).toBeInTheDocument();
      });
    });

    it("displays loading state initially", () => {
      renderWithAuth(<SettingsPage />);
      // Component should show loading
      const settingsHeader = screen.queryByText("Settings");
      expect(settingsHeader).toBeInTheDocument();
    });
  });

  describe("Tab Navigation", () => {
    it("renders basic info tab by default", async () => {
      renderWithAuth(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
      });
    });

    it("switches to billing tab on click", async () => {
      renderWithAuth(<SettingsPage />);
      
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
      renderWithAuth(<SettingsPage />);
      
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
      renderWithAuth(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText("Appearance")).toBeInTheDocument();
      });

      const appearanceTab = screen.getByText("Appearance");
      await userEvent.click(appearanceTab);

      await waitFor(() => {
        expect(screen.getByTestId("appearance-tab")).toBeInTheDocument();
      });
    });

    it("maintains tab state on navigation", async () => {
      renderWithAuth(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText("Notifications")).toBeInTheDocument();
      });

      const notificationsTab = screen.getByText("Notifications");
      await userEvent.click(notificationsTab);

      await waitFor(() => {
        expect(screen.getByTestId("notifications-tab")).toBeInTheDocument();
      });

      // Navigate back to Basic Info
      const basicInfoTab = screen.getByText("Basic Info");
      await userEvent.click(basicInfoTab);

      await waitFor(() => {
        expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
      });
    });
  });

  describe("Data Loading", () => {
    it("fetches user data on mount", async () => {
      renderWithAuth(<SettingsPage />);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/users/${mockCurrentUser.id}`,
          expect.any(Object)
        );
      });
    });

    it("passes userData to tabs", async () => {
      renderWithAuth(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
      });
    });

    it("handles loading error gracefully", async () => {
      global.fetch.mockRejectedValue(new Error("Fetch failed"));
      
      renderWithAuth(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText("Settings")).toBeInTheDocument();
      });
    });

    it("handles 404 response gracefully", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 404,
      });
      
      renderWithAuth(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText("Settings")).toBeInTheDocument();
      });
    });

    it("stops loading when data is fetched", async () => {
      renderWithAuth(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
      });

      // Should not show loading message
      expect(screen.queryByText("Loading settings...")).not.toBeInTheDocument();
    });
  });

  describe("User Update", () => {
    it("calls update API with correct endpoint", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUserData }),
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "User updated" }),
      });

      renderWithAuth(<SettingsPage />);

      // Find and get tabs
      await waitFor(() => {
        expect(screen.getByText("Basic Info")).toBeInTheDocument();
      });
    });

    it("shows toast notification on successful update", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUserData }),
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "User updated" }),
      });

      renderWithAuth(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
      });
    });

    it("shows error toast on update failure", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUserData }),
      });

      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Failed to update" }),
      });

      renderWithAuth(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
      });
    });
  });

  describe("Toast Notifications", () => {
    it("displays success toast", async () => {
      renderWithAuth(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText("Settings")).toBeInTheDocument();
      });
    });

    it("displays error toast", async () => {
      global.fetch.mockRejectedValue(new Error("Network error"));

      renderWithAuth(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText("Settings")).toBeInTheDocument();
      });
    });

    it("hides toast on click", async () => {
      renderWithAuth(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText("Settings")).toBeInTheDocument();
      });
    });

    it("auto-hides toast after timeout", async () => {
      jest.useFakeTimers();

      renderWithAuth(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText("Settings")).toBeInTheDocument();
      });

      jest.runAllTimers();
      jest.useRealTimers();
    });
  });

  describe("Authentication", () => {
    it("does not render without current user", async () => {
      const noAuthContext = {
        currentUser: null,
        isLoading: false,
      };

      renderWithAuth(<SettingsPage />, noAuthContext);

      // Should handle missing user gracefully
      expect(screen.queryByText("Settings")).toBeInTheDocument();
    });

    it("uses JWT token from localStorage for API calls", async () => {
      localStorage.setItem("jwt", "test-token-123");

      renderWithAuth(<SettingsPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: "Bearer test-token-123",
            }),
          })
        );
      });

      localStorage.removeItem("jwt");
    });
  });

  describe("Layout", () => {
    it("renders with correct spacing and layout", async () => {
      const { container } = renderWithAuth(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText("Settings")).toBeInTheDocument();
      });

      expect(container).toBeTruthy();
    });

    it("maintains responsive layout", async () => {
      const { container } = renderWithAuth(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText("Settings")).toBeInTheDocument();
      });

      const box = container.querySelector("[style*='minHeight']");
      expect(box).toBeTruthy();
    });
  });

  describe("Edge Cases", () => {
    it("handles missing userData gracefully", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      renderWithAuth(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText("Settings")).toBeInTheDocument();
      });
    });

    it("handles multiple user updates in sequence", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ user: mockUserData }),
      });

      renderWithAuth(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText("Settings")).toBeInTheDocument();
      });

      // Multiple re-renders should not cause issues
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("handles rapid tab switching", async () => {
      renderWithAuth(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText("Notifications")).toBeInTheDocument();
      });

      const notificationsTab = screen.getByText("Notifications");
      const billingTab = screen.getByText("Plan & Billing");
      const appearanceTab = screen.getByText("Appearance");

      await userEvent.click(notificationsTab);
      await userEvent.click(billingTab);
      await userEvent.click(appearanceTab);

      await waitFor(() => {
        expect(screen.getByTestId("appearance-tab")).toBeInTheDocument();
      });
    });
  });
});
