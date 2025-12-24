import React from "react";
import { render } from "@testing-library/react";
import ActiveIcon from "../ActiveIcon";
import CreateGroupIcon from "../CreateGroupIcon";
import CreateUserIcon from "../CreateUserIcon";
import CreateWorkstationIcon from "../CreateWorkstationIcon";
import EditIcon from "../EditIcon";
import FilterIcon from "../FilterIcon";
import RefreshIcon from "../RefreshIcon";
import TrashIcon from "../TrashIcon";
import UploadFileIcon from "../UploadFileIcon";
import CardsIcon from "../DisplayButton/CardsIcon";
import DisplayIcon from "../DisplayButton/DisplayIcon";
import ImageIcon from "../DisplayButton/ImageIcon";
import ListIcon from "../DisplayButton/ListIcon";

describe("asset icons render", () => {
  const cases = [
    { name: "ActiveIcon", IconComponent: ActiveIcon },
    { name: "CreateGroupIcon", IconComponent: CreateGroupIcon },
    { name: "CreateUserIcon", IconComponent: CreateUserIcon },
    { name: "CreateWorkstationIcon", IconComponent: CreateWorkstationIcon },
    { name: "EditIcon", IconComponent: EditIcon, props: { width: 16, height: 16, color: "#000" } },
    { name: "FilterIcon", IconComponent: FilterIcon },
    { name: "RefreshIcon", IconComponent: RefreshIcon },
    { name: "TrashIcon", IconComponent: TrashIcon },
    { name: "UploadFileIcon", IconComponent: UploadFileIcon },
    { name: "CardsIcon", IconComponent: CardsIcon },
    { name: "DisplayIcon", IconComponent: DisplayIcon },
    { name: "ImageIcon", IconComponent: ImageIcon },
    { name: "ListIcon", IconComponent: ListIcon },
  ];

  cases.forEach(({ name, IconComponent, props }) => {
    it(`renders ${name}`, () => {
      const Component = IconComponent;
      const { container } = render(<Component {...(props || {})} />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });
});
