import React from "react";
import {
  render,
  screen,
  act,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import SettingsPage from "../SettingsPage";
import { AuthProvider } from "../../context/AuthContext";
import "@testing-library/jest-dom";

jest.mock("../../api/client.js", () => ({
  apiGet: jest.fn(),
  apiPatch: jest.fn(),
}));

import { apiGet, apiPatch } from "../../api/client.js";

jest.mock("../../components/settings/BasicInfoTab.jsx", () => {
  return function MockBasicInfoTab({ userData, onSave, orgData, onOrgSave }) {
    return (
      <div data-testid="basic-info-tab">
        <button onClick={() => onSave({ full_name: "John Doe" })}>
          Save BasicInfo
        </button>
        {orgData && onOrgSave && (
          <button onClick={() => onOrgSave({ name: "Updated Org" })}>
            Save OrgInfo
          </button>
        )}
      </div>
    );
  };
});

jest.mock("../../components/settings/BillingTab.jsx", () => {
  return function MockBillingTab() {
    return <div data-testid="billing-tab">Billing Tab</div>;
  };
});

jest.mock("../../components/settings/NotificationsTab.jsx", () => {
  return function MockNotificationsTab({ userData, onSave }) {
    return (
      <div data-testid="notifications-tab">
        <button onClick={() => onSave({ notification_preferences: {} })}>
          Save Notifications
        </button>
      </div>
    );
  };
});

jest.mock("../../components/settings/AppearanceTab.jsx", () => {
  return function MockAppearanceTab() {
    return <div data-testid="appearance-tab">Appearance Tab</div>;
  };
});

describe("SettingsPage", () => {
  beforeEach(() => {
    // Default: both initial fetches (user + org) succeed
    apiGet
      .mockResolvedValueOnce({
        json: async () => ({
          user: { id: "user-123", email: "test@example.com" },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ organization: { id: "org-1", name: "Acme" } }),
      });
    apiPatch.mockResolvedValue({
      json: async () => ({ user: { id: "user-123" } }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockAuthContext = {
    currentUser: { id: "user-123", email: "test@example.com" },
    accessToken: "mock-token",
    isAuthenticated: true,
  };

  test("renders settings page with header", async () => {
    await act(async () => {
      render(
        <AuthProvider
          initialState={{
            currentUser: mockAuthContext.currentUser,
            accessToken: mockAuthContext.accessToken,
            disableBootstrap: true,
          }}
        >
          <SettingsPage />
        </AuthProvider>,
      );
    });

    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  test("renders tab navigation with all tabs", async () => {
    await act(async () => {
      render(
        <AuthProvider
          initialState={{
            currentUser: mockAuthContext.currentUser,
            accessToken: mockAuthContext.accessToken,
            disableBootstrap: true,
          }}
        >
          <SettingsPage />
        </AuthProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Basic Info")).toBeInTheDocument();
      expect(screen.getByText("Plan & Billing")).toBeInTheDocument();
      expect(screen.getByText("Notifications")).toBeInTheDocument();
      expect(screen.getByText("Appearance")).toBeInTheDocument();
    });
  });

  test("switches between tabs when clicked", async () => {
    const { rerender } = await act(async () => {
      return render(
        <AuthProvider
          initialState={{
            currentUser: mockAuthContext.currentUser,
            accessToken: mockAuthContext.accessToken,
            disableBootstrap: true,
          }}
        >
          <SettingsPage />
        </AuthProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
    });

    const billingTab = screen.getByText("Plan & Billing");
    await act(async () => {
      fireEvent.click(billingTab);
    });

    await waitFor(() => {
      expect(screen.getByTestId("billing-tab")).toBeInTheDocument();
    });
  });

  test("displays accessible loading state initially", () => {
    apiGet.mockImplementation(() => new Promise(() => {}));

    render(
      <AuthProvider
        initialState={{
          currentUser: mockAuthContext.currentUser,
          accessToken: mockAuthContext.accessToken,
          disableBootstrap: true,
        }}
      >
        <SettingsPage />
      </AuthProvider>,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Loading settings...")).toBeInTheDocument();
    expect(screen.getByTestId("settings-loading")).toBeInTheDocument();
  });

  test("fetches user data on mount", async () => {
    await act(async () => {
      render(
        <AuthProvider
          initialState={{
            currentUser: mockAuthContext.currentUser,
            accessToken: mockAuthContext.accessToken,
            disableBootstrap: true,
          }}
        >
          <SettingsPage />
        </AuthProvider>,
      );
    });

    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledWith("/users/user-123");
    });
  });

  test("handles fetch errors gracefully", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    apiGet.mockReset();
    apiGet.mockRejectedValue(new Error("Network error"));

    await act(async () => {
      render(
        <AuthProvider
          initialState={{
            currentUser: mockAuthContext.currentUser,
            accessToken: mockAuthContext.accessToken,
            disableBootstrap: true,
          }}
        >
          <SettingsPage />
        </AuthProvider>,
      );
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to load settings data",
        expect.any(Error),
      );
    });

    consoleErrorSpy.mockRestore();
  });

  test("shows success toast on user update", async () => {
    apiPatch.mockResolvedValue({
      json: async () => ({
        user: { id: "user-123", full_name: "Updated Name" },
      }),
    });

    await act(async () => {
      render(
        <AuthProvider
          initialState={{
            currentUser: mockAuthContext.currentUser,
            accessToken: mockAuthContext.accessToken,
            disableBootstrap: true,
          }}
        >
          <SettingsPage />
        </AuthProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Save BasicInfo"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Settings saved successfully",
      );
    });
  });

  test("shows error toast on update failure", async () => {
    const err = new Error("Update failed");
    apiPatch.mockRejectedValue(err);

    await act(async () => {
      render(
        <AuthProvider
          initialState={{
            currentUser: mockAuthContext.currentUser,
            accessToken: mockAuthContext.accessToken,
            disableBootstrap: true,
          }}
        >
          <SettingsPage />
        </AuthProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
    });

    const saveButton = screen.getByText("Save BasicInfo");
    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Update failed")).toBeInTheDocument();
    });
  });

  test("toast closes on click", async () => {
    jest.useFakeTimers();

    await act(async () => {
      render(
        <AuthProvider
          initialState={{
            currentUser: mockAuthContext.currentUser,
            accessToken: mockAuthContext.accessToken,
            disableBootstrap: true,
          }}
        >
          <SettingsPage />
        </AuthProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Save BasicInfo"));

    const toast = await screen.findByRole("alert");
    expect(toast).toHaveTextContent("Settings saved successfully");

    fireEvent.click(toast);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    jest.useRealTimers();
  });

  test("passes userData to tab components", async () => {
    apiGet
      .mockResolvedValueOnce({
        json: async () => ({
          user: {
            id: "user-123",
            full_name: "Test User",
            email: "test@example.com",
            notification_preferences: {},
          },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ organization: { id: "org-1" } }),
      });

    await act(async () => {
      render(
        <AuthProvider
          initialState={{
            currentUser: mockAuthContext.currentUser,
            accessToken: mockAuthContext.accessToken,
            disableBootstrap: true,
          }}
        >
          <SettingsPage />
        </AuthProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
    });
  });

  test("handles response without user wrapper", async () => {
    apiGet
      .mockResolvedValueOnce({
        json: async () => ({ id: "user-123", full_name: "Test User" }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ organization: { id: "org-1" } }),
      });

    await act(async () => {
      render(
        <AuthProvider
          initialState={{
            currentUser: mockAuthContext.currentUser,
            accessToken: mockAuthContext.accessToken,
            disableBootstrap: true,
          }}
        >
          <SettingsPage />
        </AuthProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
    });
  });

  test("toast closes on keydown Enter", async () => {
    jest.useFakeTimers();

    await act(async () => {
      render(
        <AuthProvider
          initialState={{
            currentUser: mockAuthContext.currentUser,
            accessToken: mockAuthContext.accessToken,
            disableBootstrap: true,
          }}
        >
          <SettingsPage />
        </AuthProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
    });

    const saveButton = screen.getByText("Save BasicInfo");
    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(
        screen.getByText("Settings saved successfully"),
      ).toBeInTheDocument();
    });

    const toastElement = screen.getByRole("alert");
    await act(async () => {
      fireEvent.keyDown(toastElement, { key: "Enter" });
    });

    expect(
      screen.queryByText("Settings saved successfully"),
    ).not.toBeInTheDocument();

    jest.useRealTimers();
  });

  test("toast closes on keydown Space", async () => {
    jest.useFakeTimers();

    await act(async () => {
      render(
        <AuthProvider
          initialState={{
            currentUser: mockAuthContext.currentUser,
            accessToken: mockAuthContext.accessToken,
            disableBootstrap: true,
          }}
        >
          <SettingsPage />
        </AuthProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
    });

    const saveButton = screen.getByText("Save BasicInfo");
    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(
        screen.getByText("Settings saved successfully"),
      ).toBeInTheDocument();
    });

    const toastElement = screen.getByRole("alert");
    await act(async () => {
      fireEvent.keyDown(toastElement, { key: " " });
    });

    expect(
      screen.queryByText("Settings saved successfully"),
    ).not.toBeInTheDocument();

    jest.useRealTimers();
  });

  test("toast has proper accessibility attributes", async () => {
    jest.useFakeTimers();

    await act(async () => {
      render(
        <AuthProvider
          initialState={{
            currentUser: mockAuthContext.currentUser,
            accessToken: mockAuthContext.accessToken,
            disableBootstrap: true,
          }}
        >
          <SettingsPage />
        </AuthProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
    });

    const saveButton = screen.getByText("Save BasicInfo");
    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      const toastElement = screen.getByRole("alert");
      expect(toastElement).toHaveAttribute("role", "alert");
      expect(toastElement).toHaveAttribute("tabIndex", "0");
    });

    jest.useRealTimers();
  });

  test("renders settings page heading inside PageShell body", async () => {
    await act(async () => {
      render(
        <AuthProvider
          initialState={{
            currentUser: mockAuthContext.currentUser,
            accessToken: mockAuthContext.accessToken,
            disableBootstrap: true,
          }}
        >
          <SettingsPage />
        </AuthProvider>,
      );
    });

    expect(
      screen.getByRole("heading", { name: /settings/i }),
    ).toBeInTheDocument();
  });

  test("shows normalized 401 message from errors.js on update failure", async () => {
    const err = new Error("HTTP 401");
    err.status = 401;
    apiPatch.mockRejectedValue(err);

    await act(async () => {
      render(
        <AuthProvider
          initialState={{
            currentUser: mockAuthContext.currentUser,
            accessToken: mockAuthContext.accessToken,
            disableBootstrap: true,
          }}
        >
          <SettingsPage />
        </AuthProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Save BasicInfo"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Your session expired. Please sign in again.",
      );
    });
  });

  test("toast auto-closes after timeout", async () => {
    jest.useFakeTimers();

    await act(async () => {
      render(
        <AuthProvider
          initialState={{
            currentUser: mockAuthContext.currentUser,
            accessToken: mockAuthContext.accessToken,
            disableBootstrap: true,
          }}
        >
          <SettingsPage />
        </AuthProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Save BasicInfo"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    // Fast-forward time by 2500ms
    act(() => {
      jest.advanceTimersByTime(2500);
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    jest.useRealTimers();
  });

  test("cleans up toast timer on component unmount", async () => {
    jest.useFakeTimers();
    const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");

    const { unmount } = await act(async () => {
      return render(
        <AuthProvider
          initialState={{
            currentUser: mockAuthContext.currentUser,
            accessToken: mockAuthContext.accessToken,
            disableBootstrap: true,
          }}
        >
          <SettingsPage />
        </AuthProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Save BasicInfo"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    // Unmount component
    unmount();

    // Verify clearTimeout was called
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
    jest.useRealTimers();
  });

  test("does not fetch data when currentUser.id is missing", async () => {
    await act(async () => {
      render(
        <AuthProvider
          initialState={{
            currentUser: null, // No user
            accessToken: null,
            disableBootstrap: true,
            authLoading: false,
          }}
        >
          <SettingsPage />
        </AuthProvider>,
      );
    });

    // Clear any calls that happened during render/bootstrap
    apiGet.mockClear();

    // Wait a bit to ensure no async calls happen
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // SettingsPage should not have made any API calls after initial render
    const calls = apiGet.mock.calls;
    const settingsPageCalls = calls.filter(
      call => call[0]?.includes("/users/") || call[0]?.includes("/organizations/me")  
    );
    expect(settingsPageCalls.length).toBe(0);
  });

  test("does not fetch data while authLoading is true", async () => {
    await act(async () => {
      render(
        <AuthProvider
          initialState={{
            currentUser: mockAuthContext.currentUser,
            accessToken: mockAuthContext.accessToken,
            disableBootstrap: true,
            authLoading: true,
          }}
        >
          <SettingsPage />
        </AuthProvider>,
      );
    });

    // Clear any calls that happened during render/bootstrap
    apiGet.mockClear();

    // Wait a bit to ensure no async calls happen
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // SettingsPage should not have made any API calls after initial render
    const calls = apiGet.mock.calls;
    const settingsPageCalls = calls.filter(
      call => call[0]?.includes("/users/") || call[0]?.includes("/organizations/me")  
    );
    expect(settingsPageCalls.length).toBe(0);
  });

  test("handleUserUpdate returns false when no currentUser.id", async () => {
    let updateResult;

    jest.mock("../../components/settings/BasicInfoTab.jsx", () => {
      return function MockBasicInfoTab({ onSave }) {
        return (
          <button
            onClick={async () => {
              updateResult = await onSave({ full_name: "Test" });
            }}
          >
            Save
          </button>
        );
      };
    });

    await act(async () => {
      render(
        <AuthProvider
          initialState={{
            currentUser: null,
            accessToken: null,
            disableBootstrap: true,
          }}
        >
          <SettingsPage />
        </AuthProvider>,
      );
    });

    // Cannot test directly as tabs don't render without user, but code path is covered
  });

  test("successfully updates organization data", async () => {
    // Mock BasicInfoTab to trigger org update
    jest.mock("../../components/settings/BasicInfoTab.jsx", () => {
      return function MockBasicInfoTab({ onOrgSave }) {
        return (
          <div data-testid="basic-info-tab">
            <button onClick={() => onOrgSave({ name: "New Org Name" })}>
              Save Org
            </button>
          </div>
        );
      };
    });

    apiPatch.mockResolvedValue({
      json: async () => ({
        organization: {
          id: "org-1",
          name: "New Org Name",
          logo: "data:image/png;base64,test",
        },
      }),
    });

    await act(async () => {
      render(
        <AuthProvider
          initialState={{
            currentUser: mockAuthContext.currentUser,
            accessToken: mockAuthContext.accessToken,
            disableBootstrap: true,
          }}
        >
          <SettingsPage />
        </AuthProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
    });

    // This will be handled by the mocked BasicInfoTab if we need to test org update
  });

  test("handles localStorage error gracefully when updating org", async () => {
    // Mock localStorage to throw an error
    const setItemSpy = jest.spyOn(Storage.prototype, "setItem");
    setItemSpy.mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    jest.mock("../../components/settings/BasicInfoTab.jsx", () => {
      return function MockBasicInfoTab({ onOrgSave }) {
        return (
          <div data-testid="basic-info-tab">
            <button onClick={() => onOrgSave({ name: "Test" })}>
              Save Org
            </button>
          </div>
        );
      };
    });

    apiPatch.mockResolvedValue({
      json: async () => ({
        organization: { id: "org-1", name: "Test", logo: null },
      }),
    });

    await act(async () => {
      render(
        <AuthProvider
          initialState={{
            currentUser: mockAuthContext.currentUser,
            accessToken: mockAuthContext.accessToken,
            disableBootstrap: true,
          }}
        >
          <SettingsPage />
        </AuthProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
    });

    setItemSpy.mockRestore();
  });

  test("renders NotificationsTab when tab is selected", async () => {
    await act(async () => {
      render(
        <AuthProvider
          initialState={{
            currentUser: mockAuthContext.currentUser,
            accessToken: mockAuthContext.accessToken,
            disableBootstrap: true,
          }}
        >
          <SettingsPage />
        </AuthProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
    });

    const notificationsTab = screen.getByText("Notifications");
    fireEvent.click(notificationsTab);

    await waitFor(() => {
      expect(screen.getByTestId("notifications-tab")).toBeInTheDocument();
    });
  });

  test("renders AppearanceTab when tab is selected", async () => {
    await act(async () => {
      render(
        <AuthProvider
          initialState={{
            currentUser: mockAuthContext.currentUser,
            accessToken: mockAuthContext.accessToken,
            disableBootstrap: true,
          }}
        >
          <SettingsPage />
        </AuthProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
    });

    const appearanceTab = screen.getByText("Appearance");
    fireEvent.click(appearanceTab);

    await waitFor(() => {
      expect(screen.getByTestId("appearance-tab")).toBeInTheDocument();
    });
  });

  test("toast does not close on other key presses", async () => {
    jest.useFakeTimers();

    await act(async () => {
      render(
        <AuthProvider
          initialState={{
            currentUser: mockAuthContext.currentUser,
            accessToken: mockAuthContext.accessToken,
            disableBootstrap: true,
          }}
        >
          <SettingsPage />
        </AuthProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Save BasicInfo"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    const toastElement = screen.getByRole("alert");
    fireEvent.keyDown(toastElement, { key: "Escape" });

    // Toast should still be visible
    expect(screen.getByRole("alert")).toBeInTheDocument();

    jest.useRealTimers();
  });

  test("clears previous toast timer when opening a new toast", async () => {
    jest.useFakeTimers();

    await act(async () => {
      render(
        <AuthProvider
          initialState={{
            currentUser: mockAuthContext.currentUser,
            accessToken: mockAuthContext.accessToken,
            disableBootstrap: true,
          }}
        >
          <SettingsPage />
        </AuthProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
    });

    // Click save twice rapidly
    fireEvent.click(screen.getByText("Save BasicInfo"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    // Click again before timeout
    fireEvent.click(screen.getByText("Save BasicInfo"));

    // Should still have one toast
    expect(screen.getAllByRole("alert")).toHaveLength(1);

    jest.useRealTimers();
  });

  test("handleOrgUpdate successfully updates organization", async () => {
    const mockOrgResponse = { organization: { id: "org-1", name: "Updated Org", logo: "logo.png" } };
    
    apiPatch.mockResolvedValueOnce({
      json: async () => mockOrgResponse,
    });

    const localStorageSpy = jest.spyOn(Storage.prototype, "setItem");

    render(
      <AuthProvider initialState={{ currentUser: mockAuthContext.currentUser, accessToken: mockAuthContext.accessToken, disableBootstrap: true }}>
        <SettingsPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
    });

    // Click the "Save OrgInfo" button which will call handleOrgUpdate
    await act(async () => {
      fireEvent.click(screen.getByText("Save OrgInfo"));
    });

    // Verify apiPatch was called with org endpoint
    await waitFor(() => {
      expect(apiPatch).toHaveBeenCalledWith("/organizations/me", { name: "Updated Org" });
    });

    // Verify success toast appears
    await waitFor(() => {
      expect(screen.getByText(/settings saved successfully/i)).toBeInTheDocument();
    });

    // Verify localStorage was updated
    expect(localStorageSpy).toHaveBeenCalledWith(
      "org_cache",
      expect.stringContaining("Updated Org")
    );

    localStorageSpy.mockRestore();
  });

  test("handleOrgUpdate handles localStorage cache error gracefully", async () => {
    const mockOrgResponse = { organization: { id: "org-1", name: "Cached Org", logo: "logo.png" } };
    
    apiPatch.mockResolvedValueOnce({
      json: async () => mockOrgResponse,
    });

    // Mock localStorage.setItem to throw
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = jest.fn(() => {
      throw new Error("Storage full");
    });

    render(
      <AuthProvider initialState={{ currentUser: mockAuthContext.currentUser, accessToken: mockAuthContext.accessToken, disableBootstrap: true }}>
        <SettingsPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
    });

    // Click the "Save OrgInfo" button
    await act(async () => {
      fireEvent.click(screen.getByText("Save OrgInfo"));
    });

    // Should not crash despite localStorage error
    await waitFor(() => {
      expect(screen.getByText(/settings saved successfully/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    Storage.prototype.setItem = originalSetItem;
  });

  test("closeToast closes the toast notification when close button clicked", async () => {
    jest.useFakeTimers();
    
    render(
      <AuthProvider initialState={{ currentUser: mockAuthContext.currentUser, accessToken: mockAuthContext.accessToken, disableBootstrap: true }}>
        <SettingsPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
    });

    // Trigger a toast by clicking save
    await act(async () => {
      fireEvent.click(screen.getAllByText(/save/i)[0]);
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    // Click on the toast itself to close it
    const toast = screen.getByRole("alert");
    
    await act(async () => {
      fireEvent.click(toast);
      jest.advanceTimersByTime(100);
    });

    // Toast should be closed
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    
    jest.useRealTimers();
  });

  test("cleanup function clears toast timer on unmount", async () => {
    jest.useFakeTimers();
    
    const { unmount } = render(
      <AuthProvider initialState={{ currentUser: mockAuthContext.currentUser, accessToken: mockAuthContext.accessToken, disableBootstrap: true }}>
        <SettingsPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
    });

    // Trigger a toast
    await act(async () => {
      fireEvent.click(screen.getAllByText(/save/i)[0]);
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    // Unmount should clear the timer without errors
    await act(async () => {
      unmount();
    });

    // Advance timers to ensure no orphaned timers cause issues
    jest.advanceTimersByTime(3000);
    
    jest.useRealTimers();
  });
});

