import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import DashboardCarousel from "../DashboardCarousel";

describe("DashboardCarousel", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("renders first slide initially", () => {
    const { container } = render(<DashboardCarousel />);
    const activeSlide = container.querySelector(".carousel-slide.active");

    expect(activeSlide).toHaveTextContent("Dashboard");
    expect(screen.getByLabelText("Previous slide")).toBeInTheDocument();
    expect(screen.getByLabelText("Next slide")).toBeInTheDocument();
  });

  test("renders five dot controls", () => {
    render(<DashboardCarousel />);

    expect(screen.getAllByLabelText(/Go to slide/)).toHaveLength(5);
  });

  test("moves to next and previous slide with controls", () => {
    const { container } = render(<DashboardCarousel />);

    fireEvent.click(screen.getByLabelText("Next slide"));
    expect(container.querySelector(".carousel-slide.active")).toHaveTextContent("Users Management");

    fireEvent.click(screen.getByLabelText("Previous slide"));
    expect(container.querySelector(".carousel-slide.active")).toHaveTextContent("Dashboard");
  });

  test("wraps around from first slide to last on previous", () => {
    const { container } = render(<DashboardCarousel />);

    fireEvent.click(screen.getByLabelText("Previous slide"));

    expect(container.querySelector(".carousel-slide.active")).toHaveTextContent("Workstations");
  });

  test("changes slide when a dot is clicked", () => {
    const { container } = render(<DashboardCarousel />);

    fireEvent.click(screen.getByLabelText("Go to slide 3"));

    expect(container.querySelector(".carousel-slide.active")).toHaveTextContent("Groups Management");
  });

  test("auto-advances every 5 seconds when autoplay is active", () => {
    const { container } = render(<DashboardCarousel />);

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(container.querySelector(".carousel-slide.active")).toHaveTextContent("Users Management");

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(container.querySelector(".carousel-slide.active")).toHaveTextContent("Groups Management");
  });

  test("pauses autoplay immediately after manual interaction", () => {
    const { container } = render(<DashboardCarousel />);

    fireEvent.click(screen.getByLabelText("Next slide"));
    expect(container.querySelector(".carousel-slide.active")).toHaveTextContent("Users Management");

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(container.querySelector(".carousel-slide.active")).toHaveTextContent("Users Management");
  });
});
