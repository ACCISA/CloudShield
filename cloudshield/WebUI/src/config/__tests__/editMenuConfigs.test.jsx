import React from "react";
import { render } from "@testing-library/react";
import {
  WORKSTATION_EDIT_MENU,
  USER_EDIT_MENU,
  GROUP_EDIT_MENU,
  FILE_EDIT_MENU,
} from "../editMenuConfigs";

describe("editMenuConfigs", () => {
  const configs = [
    { name: "WORKSTATION_EDIT_MENU", menu: WORKSTATION_EDIT_MENU },
    { name: "USER_EDIT_MENU", menu: USER_EDIT_MENU },
    { name: "GROUP_EDIT_MENU", menu: GROUP_EDIT_MENU },
    { name: "FILE_EDIT_MENU", menu: FILE_EDIT_MENU },
  ];

  it.each(configs)("has labels and icons for %s", ({ menu }) => {
    expect(Array.isArray(menu)).toBe(true);
    expect(menu).toHaveLength(2);
    menu.forEach((item) => {
      expect(item.label).toMatch(/edit|delete/i);
      expect(item.icon).toBeTruthy();
      // Rendering the icon ensures JSX elements compile
      const { container } = render(<div>{item.icon}</div>);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });
});
