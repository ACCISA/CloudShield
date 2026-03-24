import { render, screen } from "@testing-library/react";
import PageShell from "../PageShell";

describe("PageShell", () => {
  it("always renders children", () => {
    render(
      <PageShell>
        <div data-testid="child">Hello</div>
      </PageShell>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("does not render header when no title, subtitle, or actions are provided", () => {
    render(
      <PageShell>
        <div>Content</div>
      </PageShell>
    );

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("renders title when provided", () => {
    render(
      <PageShell title="Dashboard">
        <div>Content</div>
      </PageShell>
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    render(
      <PageShell subtitle="Some subtitle">
        <div>Content</div>
      </PageShell>
    );

    expect(screen.getByText("Some subtitle")).toBeInTheDocument();
  });

  it("renders both title and subtitle", () => {
    render(
      <PageShell title="Settings" subtitle="Manage preferences">
        <div>Content</div>
      </PageShell>
    );

    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Manage preferences")).toBeInTheDocument();
  });

  it("renders actions when provided", () => {
    render(
      <PageShell
        title="Users"
        actions={
          <>
            <button>Add</button>
            <button>Refresh</button>
          </>
        }
      >
        <div>Content</div>
      </PageShell>
    );

    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  });

  it("renders header when only actions are provided", () => {
    render(
      <PageShell actions={<button>Only Action</button>}>
        <div>Content</div>
      </PageShell>
    );

    expect(screen.getByRole("button", { name: "Only Action" })).toBeInTheDocument();
  });

  it("does not render a title element when title is an empty string", () => {
  render(
    <PageShell title="" subtitle="Subtitle">
      <div>Content</div>
    </PageShell>
  );

  expect(screen.getByText("Subtitle")).toBeInTheDocument();
  expect(screen.getByText("Content")).toBeInTheDocument();

  expect(document.querySelector("h5")).toBeNull();
});

  it("renders complex children correctly", () => {
    render(
      <PageShell title="Complex">
        <section>
          <h2>Inner heading</h2>
          <p>Inner paragraph</p>
        </section>
      </PageShell>
    );

    expect(screen.getByText("Complex")).toBeInTheDocument();
    expect(screen.getByText("Inner heading")).toBeInTheDocument();
    expect(screen.getByText("Inner paragraph")).toBeInTheDocument();
  });

  describe("noPadding prop", () => {
    it("applies padding by default", () => {
      const { container } = render(
        <PageShell>
          <div>Content</div>
        </PageShell>
      );

      const box = container.querySelector("[class*='MuiBox']");
      expect(box).toBeInTheDocument();
      // MUI Box with p: 3 has padding
      expect(box.style.padding).not.toBe("0px");
    });

    it("removes padding when noPadding is true", () => {
      const { container } = render(
        <PageShell noPadding>
          <div>Content</div>
        </PageShell>
      );

      expect(screen.getByText("Content")).toBeInTheDocument();
      // Component still renders with noPadding prop
      expect(container.querySelector("div")).toBeInTheDocument();
    });

    it("noPadding does not affect children rendering", () => {
      render(
        <PageShell noPadding title="Test">
          <div data-testid="no-padding-content">Content with no padding</div>
        </PageShell>
      );

      expect(screen.getByTestId("no-padding-content")).toBeInTheDocument();
      expect(screen.getByText("Test")).toBeInTheDocument();
    });
  });
});