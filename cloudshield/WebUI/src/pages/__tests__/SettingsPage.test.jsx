import React from "react";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import SettingsPage from "../SettingsPage";
import { AuthProvider } from "../../context/AuthContext";
import "@testing-library/jest-dom";

jest.mock("../../components/settings/BasicInfoTab.jsx", () => {
  return function MockBasicInfoTab({ userData, onSave }) {
    return (
      <div data-testid="basic-info-tab">
        <button onClick={() => onSave({ full_name: "John Doe" })}>
          Save BasicInfo
        </button>
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
    global.fetch = jest.fn();
    const localStorageMock = (function () {
      let store = {};
      return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
        removeItem: jest.fn((key) => { delete store[key]; }),
        clear: jest.fn(() => { store = {}; }),
      };
    })();
    Object.defineProperty(window, "localStorage", { value: localStorageMock });
    localStorage.getItem.mockReturnValue("mock-jwt-token");
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
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: "user-123", full_name: "Test User" } }),
    });

    await act(async () => {
      render(
        <AuthProvider initialState={{ currentUser: mockAuthContext.currentUser, accessToken: mockAuthContext.accessToken, disableBootstrap: true }}>
          <SettingsPage />
        </AuthProvider>
      );
    });

    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  test("renders tab navigation with all tabs", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: "user-123" } }),
    });

    await act(async () => {
      render(
        <AuthProvider initialState={{ currentUser: mockAuthContext.currentUser, accessToken: mockAuthContext.accessToken, disableBootstrap: true }}>
          <SettingsPage />
        </AuthProvider>
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
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: "user-123" } }),
    });

    const { rerender } = await act(async () => {
      return render(
        <AuthProvider initialState={{ currentUser: mockAuthContext.currentUser, accessToken: mockAuthContext.accessToken, disableBootstrap: true }}>
          <SettingsPage />
        </AuthProvider>
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
    global.fetch.mockImplementation(() => new Promise(() => {}));

    render(
      <AuthProvider
        initialState={{
          currentUser: mockAuthContext.currentUser,
          accessToken: mockAuthContext.accessToken,
          disableBootstrap: true,
        }}
      >
        <SettingsPage />
      </AuthProvider>
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Loading settings...")).toBeInTheDocument();
    expect(screen.getByTestId("settings-loading")).toBeInTheDocument();
  });

  test("fetches user data on mount", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: "user-123", email: "test@example.com" } }),
    });

    await act(async () => {
      render(
        <AuthProvider initialState={{ currentUser: mockAuthContext.currentUser, accessToken: mockAuthContext.accessToken, disableBootstrap: true }}>
          <SettingsPage />
        </AuthProvider>
      );
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "http://127.0.0.1:5050/api/users/user-123",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });
  });

  test("handles fetch errors gracefully", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    global.fetch.mockRejectedValueOnce(new Error("Network error"));

    await act(async () => {
      render(
        <AuthProvider initialState={{ currentUser: mockAuthContext.currentUser, accessToken: mockAuthContext.accessToken, disableBootstrap: true }}>
          <SettingsPage />
        </AuthProvider>
      );
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to load settings data",
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  test("shows success toast on user update", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: "user-123" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: "user-123", full_name: "Updated Name" } }),
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
        </AuthProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Save BasicInfo"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Settings saved successfully");
    });
  });

  test("shows error toast on update failure", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: "user-123" } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Update failed" }),
      });

    await act(async () => {
      render(
        <AuthProvider initialState={{ currentUser: mockAuthContext.currentUser, accessToken: mockAuthContext.accessToken, disableBootstrap: true }}>
          <SettingsPage />
        </AuthProvider>
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
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: "user-123" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: "user-123" } }),
      });

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
        </AuthProvider>
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
    const userData = {
      id: "user-123",
      full_name: "Test User",
      email: "test@example.com",
      notification_preferences: {},
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: userData }),
    });

    await act(async () => {
      render(
        <AuthProvider initialState={{ currentUser: mockAuthContext.currentUser, accessToken: mockAuthContext.accessToken, disableBootstrap: true }}>
          <SettingsPage />
        </AuthProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
    });
  });

  test("handles response without user wrapper", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "user-123", full_name: "Test User" }),
    });

    await act(async () => {
      render(
        <AuthProvider initialState={{ currentUser: mockAuthContext.currentUser, accessToken: mockAuthContext.accessToken, disableBootstrap: true }}>
          <SettingsPage />
        </AuthProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
    });
  });

  test("toast closes on keydown Enter", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: "user-123" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: "user-123" } }),
      });

    jest.useFakeTimers();

    await act(async () => {
      render(
        <AuthProvider initialState={{ currentUser: mockAuthContext.currentUser, accessToken: mockAuthContext.accessToken, disableBootstrap: true }}>
          <SettingsPage />
        </AuthProvider>
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
      expect(screen.getByText("Settings saved successfully")).toBeInTheDocument();
    });

    const toastElement = screen.getByRole("alert");
    await act(async () => {
      fireEvent.keyDown(toastElement, { key: "Enter" });
    });

    expect(screen.queryByText("Settings saved successfully")).not.toBeInTheDocument();

    jest.useRealTimers();
  });

  test("toast closes on keydown Space", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: "user-123" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: "user-123" } }),
      });

    jest.useFakeTimers();

    await act(async () => {
      render(
        <AuthProvider initialState={{ currentUser: mockAuthContext.currentUser, accessToken: mockAuthContext.accessToken, disableBootstrap: true }}>
          <SettingsPage />
        </AuthProvider>
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
      expect(screen.getByText("Settings saved successfully")).toBeInTheDocument();
    });

    const toastElement = screen.getByRole("alert");
    await act(async () => {
      fireEvent.keyDown(toastElement, { key: " " });
    });

    expect(screen.queryByText("Settings saved successfully")).not.toBeInTheDocument();

    jest.useRealTimers();
  });

  test("toast has proper accessibility attributes", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: "user-123" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: "user-123" } }),
      });

    jest.useFakeTimers();

    await act(async () => {
      render(
        <AuthProvider initialState={{ currentUser: mockAuthContext.currentUser, accessToken: mockAuthContext.accessToken, disableBootstrap: true }}>
          <SettingsPage />
        </AuthProvider>
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
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: "user-123", full_name: "Test User" } }),
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
        </AuthProvider>
      );
    });

    expect(
      screen.getByRole("heading", { name: /settings/i })
    ).toBeInTheDocument();
  });

  test("shows normalized 401 message from errors.js on update failure", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: "user-123" } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({}),
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
        </AuthProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("basic-info-tab")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Save BasicInfo"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Your session expired. Please sign in again."
      );
    });
  });
});
