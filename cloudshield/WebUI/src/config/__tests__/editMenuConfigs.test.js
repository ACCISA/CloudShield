import React from "react";
import {
  WORKSTATION_EDIT_MENU,
  USER_EDIT_MENU,
  GROUP_EDIT_MENU,
  FILE_EDIT_MENU,
} from "../editMenuConfigs";

// Mock the icon components
jest.mock("../../assets/EditIcon", () => {
  return function MockEditIcon({ width, height, color }) {
    return (
      <svg data-testid="edit-icon" width={width} height={height} fill={color} />
    );
  };
});

jest.mock("../../assets/TrashIcon", () => {
  return function MockTrashIcon({ width, height, color }) {
    return (
      <svg
        data-testid="trash-icon"
        width={width}
        height={height}
        fill={color}
      />
    );
  };
});

describe("editMenuConfigs", () => {
  describe("WORKSTATION_EDIT_MENU", () => {
    it("should export an array with 2 items", () => {
      expect(Array.isArray(WORKSTATION_EDIT_MENU)).toBe(true);
      expect(WORKSTATION_EDIT_MENU).toHaveLength(2);
    });

    it("should have edit workstation as first item", () => {
      const editItem = WORKSTATION_EDIT_MENU[0];
      expect(editItem.label).toBe("edit workstation");
      expect(editItem.color).toBe("#fff");
      expect(editItem.onClick).toBeNull();
    });

    it("should have delete workstation as second item", () => {
      const deleteItem = WORKSTATION_EDIT_MENU[1];
      expect(deleteItem.label).toBe("delete workstation");
      expect(deleteItem.color).toBe("#D51616");
      expect(deleteItem.onClick).toBeNull();
    });

    it("should have EditIcon for edit item", () => {
      const editItem = WORKSTATION_EDIT_MENU[0];
      expect(React.isValidElement(editItem.icon)).toBe(true);
      expect(editItem.icon.type.name).toBe("MockEditIcon");
    });

    it("should have TrashIcon for delete item", () => {
      const deleteItem = WORKSTATION_EDIT_MENU[1];
      expect(React.isValidElement(deleteItem.icon)).toBe(true);
      expect(deleteItem.icon.type.name).toBe("MockTrashIcon");
    });

    it("should have correct icon props for edit item", () => {
      const editItem = WORKSTATION_EDIT_MENU[0];
      expect(editItem.icon.props.width).toBe(15);
      expect(editItem.icon.props.height).toBe(16);
      expect(editItem.icon.props.color).toBe("#fff");
    });

    it("should have correct icon props for delete item", () => {
      const deleteItem = WORKSTATION_EDIT_MENU[1];
      expect(deleteItem.icon.props.width).toBe(12);
      expect(deleteItem.icon.props.height).toBe(14);
      expect(deleteItem.icon.props.color).toBe("#D51616");
    });
  });

  describe("USER_EDIT_MENU", () => {
    it("should export an array with 2 items", () => {
      expect(Array.isArray(USER_EDIT_MENU)).toBe(true);
      expect(USER_EDIT_MENU).toHaveLength(2);
    });

    it("should have edit user as first item", () => {
      const editItem = USER_EDIT_MENU[0];
      expect(editItem.label).toBe("edit user");
      expect(editItem.color).toBe("#fff");
      expect(editItem.onClick).toBeNull();
    });

    it("should have delete user as second item", () => {
      const deleteItem = USER_EDIT_MENU[1];
      expect(deleteItem.label).toBe("delete user");
      expect(deleteItem.color).toBe("#D51616");
      expect(deleteItem.onClick).toBeNull();
    });

    it("should have EditIcon for edit item", () => {
      const editItem = USER_EDIT_MENU[0];
      expect(React.isValidElement(editItem.icon)).toBe(true);
      expect(editItem.icon.type.name).toBe("MockEditIcon");
    });

    it("should have TrashIcon for delete item", () => {
      const deleteItem = USER_EDIT_MENU[1];
      expect(React.isValidElement(deleteItem.icon)).toBe(true);
      expect(deleteItem.icon.type.name).toBe("MockTrashIcon");
    });

    it("should have correct icon props for edit item", () => {
      const editItem = USER_EDIT_MENU[0];
      expect(editItem.icon.props.width).toBe(15);
      expect(editItem.icon.props.height).toBe(16);
      expect(editItem.icon.props.color).toBe("#fff");
    });

    it("should have correct icon props for delete item", () => {
      const deleteItem = USER_EDIT_MENU[1];
      expect(deleteItem.icon.props.width).toBe(12);
      expect(deleteItem.icon.props.height).toBe(14);
      expect(deleteItem.icon.props.color).toBe("#D51616");
    });
  });

  describe("GROUP_EDIT_MENU", () => {
    it("should export an array with 2 items", () => {
      expect(Array.isArray(GROUP_EDIT_MENU)).toBe(true);
      expect(GROUP_EDIT_MENU).toHaveLength(2);
    });

    it("should have edit group as first item", () => {
      const editItem = GROUP_EDIT_MENU[0];
      expect(editItem.label).toBe("edit group");
      expect(editItem.color).toBe("#fff");
      expect(editItem.onClick).toBeNull();
    });

    it("should have delete group as second item", () => {
      const deleteItem = GROUP_EDIT_MENU[1];
      expect(deleteItem.label).toBe("delete group");
      expect(deleteItem.color).toBe("#D51616");
      expect(deleteItem.onClick).toBeNull();
    });

    it("should have EditIcon for edit item", () => {
      const editItem = GROUP_EDIT_MENU[0];
      expect(React.isValidElement(editItem.icon)).toBe(true);
      expect(editItem.icon.type.name).toBe("MockEditIcon");
    });

    it("should have TrashIcon for delete item", () => {
      const deleteItem = GROUP_EDIT_MENU[1];
      expect(React.isValidElement(deleteItem.icon)).toBe(true);
      expect(deleteItem.icon.type.name).toBe("MockTrashIcon");
    });

    it("should have correct icon props for edit item", () => {
      const editItem = GROUP_EDIT_MENU[0];
      expect(editItem.icon.props.width).toBe(15);
      expect(editItem.icon.props.height).toBe(16);
      expect(editItem.icon.props.color).toBe("#fff");
    });

    it("should have correct icon props for delete item", () => {
      const deleteItem = GROUP_EDIT_MENU[1];
      expect(deleteItem.icon.props.width).toBe(12);
      expect(deleteItem.icon.props.height).toBe(14);
      expect(deleteItem.icon.props.color).toBe("#D51616");
    });
  });

  describe("FILE_EDIT_MENU", () => {
    it("should export an array with 2 items", () => {
      expect(Array.isArray(FILE_EDIT_MENU)).toBe(true);
      expect(FILE_EDIT_MENU).toHaveLength(2);
    });

    it("should have edit file as first item", () => {
      const editItem = FILE_EDIT_MENU[0];
      expect(editItem.label).toBe("edit file");
      expect(editItem.color).toBe("#fff");
      expect(editItem.onClick).toBeNull();
    });

    it("should have delete file as second item", () => {
      const deleteItem = FILE_EDIT_MENU[1];
      expect(deleteItem.label).toBe("delete file");
      expect(deleteItem.color).toBe("#D51616");
      expect(deleteItem.onClick).toBeNull();
    });

    it("should have EditIcon for edit item", () => {
      const editItem = FILE_EDIT_MENU[0];
      expect(React.isValidElement(editItem.icon)).toBe(true);
      expect(editItem.icon.type.name).toBe("MockEditIcon");
    });

    it("should have TrashIcon for delete item", () => {
      const deleteItem = FILE_EDIT_MENU[1];
      expect(React.isValidElement(deleteItem.icon)).toBe(true);
      expect(deleteItem.icon.type.name).toBe("MockTrashIcon");
    });

    it("should have correct icon props for edit item", () => {
      const editItem = FILE_EDIT_MENU[0];
      expect(editItem.icon.props.width).toBe(15);
      expect(editItem.icon.props.height).toBe(16);
      expect(editItem.icon.props.color).toBe("#fff");
    });

    it("should have correct icon props for delete item", () => {
      const deleteItem = FILE_EDIT_MENU[1];
      expect(deleteItem.icon.props.width).toBe(12);
      expect(deleteItem.icon.props.height).toBe(14);
      expect(deleteItem.icon.props.color).toBe("#D51616");
    });
  });

  describe("Menu Structure Consistency", () => {
    it("should have consistent structure across all menus", () => {
      const menus = [
        WORKSTATION_EDIT_MENU,
        USER_EDIT_MENU,
        GROUP_EDIT_MENU,
        FILE_EDIT_MENU,
      ];

      menus.forEach((menu) => {
        expect(menu).toHaveLength(2);
        menu.forEach((item) => {
          expect(item).toHaveProperty("icon");
          expect(item).toHaveProperty("label");
          expect(item).toHaveProperty("color");
          expect(item).toHaveProperty("onClick");
        });
      });
    });

    it("should have white color for all edit items", () => {
      const editItems = [
        WORKSTATION_EDIT_MENU[0],
        USER_EDIT_MENU[0],
        GROUP_EDIT_MENU[0],
        FILE_EDIT_MENU[0],
      ];

      editItems.forEach((item) => {
        expect(item.color).toBe("#fff");
      });
    });

    it("should have red color for all delete items", () => {
      const deleteItems = [
        WORKSTATION_EDIT_MENU[1],
        USER_EDIT_MENU[1],
        GROUP_EDIT_MENU[1],
        FILE_EDIT_MENU[1],
      ];

      deleteItems.forEach((item) => {
        expect(item.color).toBe("#D51616");
      });
    });

    it("should have null onClick for all items", () => {
      const allMenus = [
        ...WORKSTATION_EDIT_MENU,
        ...USER_EDIT_MENU,
        ...GROUP_EDIT_MENU,
        ...FILE_EDIT_MENU,
      ];

      allMenus.forEach((item) => {
        expect(item.onClick).toBeNull();
      });
    });

    it("should use EditIcon with same dimensions across all menus", () => {
      const editItems = [
        WORKSTATION_EDIT_MENU[0],
        USER_EDIT_MENU[0],
        GROUP_EDIT_MENU[0],
        FILE_EDIT_MENU[0],
      ];

      editItems.forEach((item) => {
        expect(item.icon.props.width).toBe(15);
        expect(item.icon.props.height).toBe(16);
      });
    });

    it("should use TrashIcon with same dimensions across all menus", () => {
      const deleteItems = [
        WORKSTATION_EDIT_MENU[1],
        USER_EDIT_MENU[1],
        GROUP_EDIT_MENU[1],
        FILE_EDIT_MENU[1],
      ];

      deleteItems.forEach((item) => {
        expect(item.icon.props.width).toBe(12);
        expect(item.icon.props.height).toBe(14);
      });
    });
  });
});
