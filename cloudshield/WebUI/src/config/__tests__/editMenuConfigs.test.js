import React from 'react';
import {
  WORKSTATION_EDIT_MENU,
  USER_EDIT_MENU,
  GROUP_EDIT_MENU,
  FILE_EDIT_MENU,
} from '../editMenuConfigs';

describe('editMenuConfigs', () => {
  describe('WORKSTATION_EDIT_MENU', () => {
    it('exports WORKSTATION_EDIT_MENU array', () => {
      expect(Array.isArray(WORKSTATION_EDIT_MENU)).toBe(true);
    });

    it('has two menu items', () => {
      expect(WORKSTATION_EDIT_MENU.length).toBe(2);
    });

    it('first item is for edit action', () => {
      expect(WORKSTATION_EDIT_MENU[0].label).toBe('edit workstation');
      expect(WORKSTATION_EDIT_MENU[0].color).toBe('#fff');
    });

    it('second item is for delete action', () => {
      expect(WORKSTATION_EDIT_MENU[1].label).toBe('delete workstation');
      expect(WORKSTATION_EDIT_MENU[1].color).toBe('#D51616');
    });

    it('all items have icon property', () => {
      WORKSTATION_EDIT_MENU.forEach(item => {
        expect(item.icon).toBeDefined();
      });
    });

    it('all items have label property', () => {
      WORKSTATION_EDIT_MENU.forEach(item => {
        expect(item.label).toBeDefined();
        expect(typeof item.label).toBe('string');
      });
    });

    it('all items have color property', () => {
      WORKSTATION_EDIT_MENU.forEach(item => {
        expect(item.color).toBeDefined();
        expect(typeof item.color).toBe('string');
      });
    });

    it('all items have onClick property', () => {
      WORKSTATION_EDIT_MENU.forEach(item => {
        expect(item.hasOwnProperty('onClick')).toBe(true);
      });
    });

    it('onClick values are null by default', () => {
      WORKSTATION_EDIT_MENU.forEach(item => {
        expect(item.onClick).toBeNull();
      });
    });

    it('icons are React elements', () => {
      WORKSTATION_EDIT_MENU.forEach(item => {
        expect(React.isValidElement(item.icon)).toBe(true);
      });
    });
  });

  describe('USER_EDIT_MENU', () => {
    it('exports USER_EDIT_MENU array', () => {
      expect(Array.isArray(USER_EDIT_MENU)).toBe(true);
    });

    it('has two menu items', () => {
      expect(USER_EDIT_MENU.length).toBe(2);
    });

    it('first item is for edit action', () => {
      expect(USER_EDIT_MENU[0].label).toBe('edit user');
      expect(USER_EDIT_MENU[0].color).toBe('#fff');
    });

    it('second item is for delete action', () => {
      expect(USER_EDIT_MENU[1].label).toBe('delete user');
      expect(USER_EDIT_MENU[1].color).toBe('#D51616');
    });

    it('all items have required properties', () => {
      USER_EDIT_MENU.forEach(item => {
        expect(item.icon).toBeDefined();
        expect(item.label).toBeDefined();
        expect(item.color).toBeDefined();
        expect(item.hasOwnProperty('onClick')).toBe(true);
      });
    });

    it('icons are React elements', () => {
      USER_EDIT_MENU.forEach(item => {
        expect(React.isValidElement(item.icon)).toBe(true);
      });
    });
  });

  describe('GROUP_EDIT_MENU', () => {
    it('exports GROUP_EDIT_MENU array', () => {
      expect(Array.isArray(GROUP_EDIT_MENU)).toBe(true);
    });

    it('has two menu items', () => {
      expect(GROUP_EDIT_MENU.length).toBe(2);
    });

    it('first item is for edit action', () => {
      expect(GROUP_EDIT_MENU[0].label).toBe('edit group');
      expect(GROUP_EDIT_MENU[0].color).toBe('#fff');
    });

    it('second item is for delete action', () => {
      expect(GROUP_EDIT_MENU[1].label).toBe('delete group');
      expect(GROUP_EDIT_MENU[1].color).toBe('#D51616');
    });

    it('all items have required properties', () => {
      GROUP_EDIT_MENU.forEach(item => {
        expect(item.icon).toBeDefined();
        expect(item.label).toBeDefined();
        expect(item.color).toBeDefined();
        expect(item.hasOwnProperty('onClick')).toBe(true);
      });
    });

    it('icons are React elements', () => {
      GROUP_EDIT_MENU.forEach(item => {
        expect(React.isValidElement(item.icon)).toBe(true);
      });
    });
  });

  describe('FILE_EDIT_MENU', () => {
    it('exports FILE_EDIT_MENU array', () => {
      expect(Array.isArray(FILE_EDIT_MENU)).toBe(true);
    });

    it('has two menu items', () => {
      expect(FILE_EDIT_MENU.length).toBe(2);
    });

    it('first item is for edit action', () => {
      expect(FILE_EDIT_MENU[0].label).toBe('edit file');
      expect(FILE_EDIT_MENU[0].color).toBe('#fff');
    });

    it('second item is for delete action', () => {
      expect(FILE_EDIT_MENU[1].label).toBe('delete file');
      expect(FILE_EDIT_MENU[1].color).toBe('#D51616');
    });

    it('all items have required properties', () => {
      FILE_EDIT_MENU.forEach(item => {
        expect(item.icon).toBeDefined();
        expect(item.label).toBeDefined();
        expect(item.color).toBeDefined();
        expect(item.hasOwnProperty('onClick')).toBe(true);
      });
    });

    it('icons are React elements', () => {
      FILE_EDIT_MENU.forEach(item => {
        expect(React.isValidElement(item.icon)).toBe(true);
      });
    });
  });

  describe('All menus structure consistency', () => {
    const allMenus = [
      WORKSTATION_EDIT_MENU,
      USER_EDIT_MENU,
      GROUP_EDIT_MENU,
      FILE_EDIT_MENU,
    ];

    it('all menus have the same length', () => {
      const lengths = allMenus.map(menu => menu.length);
      expect(new Set(lengths).size).toBe(1);
      expect(lengths[0]).toBe(2);
    });

    it('all menus have the same property structure', () => {
      const requiredProps = ['icon', 'label', 'color', 'onClick'];
      
      allMenus.forEach(menu => {
        menu.forEach(item => {
          requiredProps.forEach(prop => {
            expect(item.hasOwnProperty(prop)).toBe(true);
          });
        });
      });
    });

    it('edit items always have white color', () => {
      allMenus.forEach(menu => {
        expect(menu[0].color).toBe('#fff');
      });
    });

    it('delete items always have red color', () => {
      allMenus.forEach(menu => {
        expect(menu[1].color).toBe('#D51616');
      });
    });

    it('onClick values are null for all items', () => {
      allMenus.forEach(menu => {
        menu.forEach(item => {
          expect(item.onClick).toBeNull();
        });
      });
    });

    it('all labels follow naming pattern', () => {
      expect(USER_EDIT_MENU[0].label).toContain('edit');
      expect(USER_EDIT_MENU[1].label).toContain('delete');
      expect(GROUP_EDIT_MENU[0].label).toContain('edit');
      expect(GROUP_EDIT_MENU[1].label).toContain('delete');
      expect(WORKSTATION_EDIT_MENU[0].label).toContain('edit');
      expect(WORKSTATION_EDIT_MENU[1].label).toContain('delete');
      expect(FILE_EDIT_MENU[0].label).toContain('edit');
      expect(FILE_EDIT_MENU[1].label).toContain('delete');
    });
  });

  describe('Menu accessibility', () => {
    it('WORKSTATION_EDIT_MENU items have descriptive labels', () => {
      WORKSTATION_EDIT_MENU.forEach(item => {
        expect(item.label.length).toBeGreaterThan(0);
        expect(item.label).toMatch(/^[a-z\s]+$/);
      });
    });

    it('USER_EDIT_MENU items have descriptive labels', () => {
      USER_EDIT_MENU.forEach(item => {
        expect(item.label.length).toBeGreaterThan(0);
        expect(item.label).toMatch(/^[a-z\s]+$/);
      });
    });

    it('GROUP_EDIT_MENU items have descriptive labels', () => {
      GROUP_EDIT_MENU.forEach(item => {
        expect(item.label.length).toBeGreaterThan(0);
        expect(item.label).toMatch(/^[a-z\s]+$/);
      });
    });

    it('FILE_EDIT_MENU items have descriptive labels', () => {
      FILE_EDIT_MENU.forEach(item => {
        expect(item.label.length).toBeGreaterThan(0);
        expect(item.label).toMatch(/^[a-z\s]+$/);
      });
    });
  });

  describe('Color constants', () => {
    it('white color is consistently used', () => {
      const editItems = [
        WORKSTATION_EDIT_MENU[0],
        USER_EDIT_MENU[0],
        GROUP_EDIT_MENU[0],
        FILE_EDIT_MENU[0],
      ];
      
      editItems.forEach(item => {
        expect(item.color).toBe('#fff');
      });
    });

    it('red color is consistently used for delete', () => {
      const deleteItems = [
        WORKSTATION_EDIT_MENU[1],
        USER_EDIT_MENU[1],
        GROUP_EDIT_MENU[1],
        FILE_EDIT_MENU[1],
      ];
      
      deleteItems.forEach(item => {
        expect(item.color).toBe('#D51616');
      });
    });
  });
});
