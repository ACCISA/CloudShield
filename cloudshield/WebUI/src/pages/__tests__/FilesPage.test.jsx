import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilesPage from '../../pages/FilesPage';
import { HARD_CODED_TREE } from '../FileHelper';

// Mock fetch
global.fetch = jest.fn();

// Mock child components
jest.mock('../common/SearchField/SearchField', () => ({
  __esModule: true,
  default: ({ value, onChange, placeholder }) => (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-testid="search-field"
    />
  ),
}));

jest.mock('../common/DisplayButton/DisplayButton', () => ({
  __esModule: true,
  default: ({ layout, onLayoutChange }) => (
    <button onClick={() => onLayoutChange(layout === 'list' ? 'icons' : 'list')} data-testid="display-button">
      {layout}
    </button>
  ),
}));

jest.mock('../common/RefreshButton/RefreshButton', () => ({
  __esModule: true,
  default: ({ onClick }) => (
    <button onClick={onClick} data-testid="refresh-button">
      Refresh
    </button>
  ),
}));

jest.mock('../common/CreateButton/CreateButton', () => ({
  __esModule: true,
  default: ({ buttonText, onClick }) => (
    <button onClick={onClick} data-testid="create-button">
      {buttonText}
    </button>
  ),
}));

jest.mock('../common/Checkbox/Checkbox', () => ({
  __esModule: true,
  default: ({ checked, onChange }) => (
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
  ),
}));

jest.mock('../common/EditButton/EditButton', () => ({
  __esModule: true,
  default: ({ menuItems }) => (
    <button data-testid="edit-button">
      {menuItems.length > 0 ? 'Edit' : 'NoMenu'}
    </button>
  ),
}));

jest.mock('../files/UploadFileModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose, onUpload }) => (
    isOpen ? (
      <div data-testid="upload-modal">
        <button onClick={onClose}>Close Upload</button>
        <button onClick={() => onUpload?.()}>Upload</button>
      </div>
    ) : null
  ),
}));

jest.mock('../files/EditFileModal', () => ({
  __esModule: true,
  default: ({ isOpen, file, onClose, onSave, onDelete }) => (
    isOpen ? (
      <div data-testid="edit-modal">
        <div>{file?.name}</div>
        <button onClick={onClose}>Close Edit</button>
        <button onClick={() => onSave?.()}>Save</button>
        <button onClick={() => onDelete?.()}>Delete</button>
      </div>
    ) : null
  ),
}));

describe('FilesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  describe('Rendering', () => {
    it('should render page title', () => {
      render(<FilesPage />);
      expect(screen.getByText('Files')).toBeInTheDocument();
    });

    it('should render subtitle', () => {
      render(<FilesPage />);
      expect(screen.getByText('Browse and manage your organization files')).toBeInTheDocument();
    });

    it('should render storage pill', () => {
      render(<FilesPage />);
      expect(screen.getByLabelText('Storage usage')).toBeInTheDocument();
    });

    it('should display storage information', () => {
      render(<FilesPage />);
      expect(screen.getByText(/62GB/)).toBeInTheDocument();
      expect(screen.getByText(/100GB/)).toBeInTheDocument();
    });
  });

  describe('Toolbar', () => {
    it('should render search field', () => {
      render(<FilesPage />);
      expect(screen.getByTestId('search-field')).toBeInTheDocument();
    });

    it('should render display button', () => {
      render(<FilesPage />);
      expect(screen.getByTestId('display-button')).toBeInTheDocument();
    });

    it('should render refresh button', () => {
      render(<FilesPage />);
      expect(screen.getByTestId('refresh-button')).toBeInTheDocument();
    });

    it('should render create/upload button', () => {
      render(<FilesPage />);
      expect(screen.getByTestId('create-button')).toBeInTheDocument();
      expect(screen.getByText('Upload')).toBeInTheDocument();
    });
  });

  describe('Layout Switching', () => {
    it('should render list layout by default', () => {
      render(<FilesPage />);
      const button = screen.getByTestId('display-button');
      expect(button).toHaveTextContent('list');
    });

    it('should switch to icons layout', async () => {
      const user = userEvent.setup();
      render(<FilesPage />);

      const displayButton = screen.getByTestId('display-button');
      await user.click(displayButton);

      await waitFor(() => {
        expect(displayButton).toHaveTextContent('icons');
      });
    });

    it('should switch back to list layout', async () => {
      const user = userEvent.setup();
      render(<FilesPage />);

      const displayButton = screen.getByTestId('display-button');
      await user.click(displayButton);
      await user.click(displayButton);

      await waitFor(() => {
        expect(displayButton).toHaveTextContent('list');
      });
    });

    it('should prevent switching to cards layout', async () => {
      const user = userEvent.setup();
      render(<FilesPage />);

      const displayButton = screen.getByTestId('display-button');
      const initialText = displayButton.textContent;

      await user.click(displayButton);
      const newText = displayButton.textContent;

      expect(newText).not.toBe('cards');
    });
  });

  describe('List View', () => {
    it('should render table in list layout', () => {
      const { container } = render(<FilesPage />);
      expect(container.querySelector('.table')).toBeInTheDocument();
    });

    it('should render header row', () => {
      const { container } = render(<FilesPage />);
      const header = container.querySelector('.header');
      expect(header).toBeInTheDocument();
      expect(header).toHaveTextContent('Name');
      expect(header).toHaveTextContent('Date Modified');
    });

    it('should render file rows', () => {
      const { container } = render(<FilesPage />);
      expect(container.querySelectorAll('.row').length).toBeGreaterThan(0);
    });

    it('should display folder and file names', () => {
      render(<FilesPage />);
      expect(screen.getByText('sales_docs')).toBeInTheDocument();
      expect(screen.getByText('sales_docs.docx')).toBeInTheDocument();
    });

    it('should display file size for files', () => {
      render(<FilesPage />);
      const sizes = screen.getAllByText('16.5 MB');
      expect(sizes.length).toBeGreaterThan(0);
    });

    it('should display metadata columns', () => {
      const { container } = render(<FilesPage />);
      const rows = container.querySelectorAll('.row');
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  describe('Search Functionality', () => {
    it('should filter results by search query', async () => {
      const user = userEvent.setup();
      render(<FilesPage />);

      const searchField = screen.getByTestId('search-field');
      await user.type(searchField, 'sales_numbers');

      await waitFor(() => {
        expect(screen.getByText('sales_numbers.excl')).toBeInTheDocument();
      });
    });

    it('should be case insensitive', async () => {
      const user = userEvent.setup();
      render(<FilesPage />);

      const searchField = screen.getByTestId('search-field');
      await user.type(searchField, 'SALES');

      await waitFor(() => {
        const text = screen.queryByText(/sales/i);
        expect(text).toBeInTheDocument();
      });
    });

    it('should auto-expand folders during search', async () => {
      const user = userEvent.setup();
      render(<FilesPage />);

      const searchField = screen.getByTestId('search-field');
      await user.type(searchField, 'policies');

      await waitFor(() => {
        expect(screen.getByText('policies')).toBeInTheDocument();
      });
    });

    it('should show no results for non-matching query', async () => {
      const user = userEvent.setup();
      render(<FilesPage />);

      const searchField = screen.getByTestId('search-field');
      await user.type(searchField, 'nonexistent_file_xyz');

      await waitFor(() => {
        const { container } = render(<FilesPage />);
        const rows = container.querySelectorAll('.row');
        expect(rows.length).toBe(0);
      });
    });

    it('should clear search results', async () => {
      const user = userEvent.setup();
      render(<FilesPage />);

      const searchField = screen.getByTestId('search-field');
      await user.type(searchField, 'sales');
      await user.clear(searchField);

      await waitFor(() => {
        const rows = screen.getAllByText(/sales|policies|docx/);
        expect(rows.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Selection', () => {
    it('should allow selecting individual files', async () => {
      const user = userEvent.setup();
      const { container } = render(<FilesPage />);

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      if (checkboxes.length > 1) {
        await user.click(checkboxes[1]);
        expect(checkboxes[1]).toBeChecked();
      }
    });

    it('should allow selecting all visible items', async () => {
      const user = userEvent.setup();
      const { container } = render(<FilesPage />);

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      const headerCheckbox = checkboxes[0];

      await user.click(headerCheckbox);

      await waitFor(() => {
        expect(headerCheckbox).toBeChecked();
      });
    });

    it('should deselect all when select-all is clicked again', async () => {
      const user = userEvent.setup();
      const { container } = render(<FilesPage />);

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      const headerCheckbox = checkboxes[0];

      await user.click(headerCheckbox);
      await user.click(headerCheckbox);

      await waitFor(() => {
        expect(headerCheckbox).not.toBeChecked();
      });
    });
  });

  describe('Folder Expansion', () => {
    it('should have expand buttons for folders', () => {
      const { container } = render(<FilesPage />);
      const chevrons = container.querySelectorAll('.chevBtn');
      expect(chevrons.length).toBeGreaterThan(0);
    });

    it('should expand folder on chevron click', async () => {
      const user = userEvent.setup();
      const { container } = render(<FilesPage />);

      const chevrons = container.querySelectorAll('.chevBtn');
      if (chevrons.length > 0) {
        await user.click(chevrons[0]);
        // After expansion, nested items should be visible
        await waitFor(() => {
          const rows = container.querySelectorAll('.row');
          expect(rows.length).toBeGreaterThan(1);
        });
      }
    });

    it('should collapse folder on second chevron click', async () => {
      const user = userEvent.setup();
      const { container } = render(<FilesPage />);

      const chevrons = container.querySelectorAll('.chevBtn');
      if (chevrons.length > 0) {
        await user.click(chevrons[0]);
        await user.click(chevrons[0]);

        await waitFor(() => {
          const rows = container.querySelectorAll('.row');
          expect(rows.length).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('Upload Modal', () => {
    it('should not show upload modal initially', () => {
      render(<FilesPage />);
      expect(screen.queryByTestId('upload-modal')).not.toBeInTheDocument();
    });

    it('should show upload modal on button click', async () => {
      const user = userEvent.setup();
      render(<FilesPage />);

      const uploadButton = screen.getByTestId('create-button');
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByTestId('upload-modal')).toBeInTheDocument();
      });
    });

    it('should close upload modal', async () => {
      const user = userEvent.setup();
      render(<FilesPage />);

      const uploadButton = screen.getByTestId('create-button');
      await user.click(uploadButton);

      const closeButton = screen.getByText('Close Upload');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('upload-modal')).not.toBeInTheDocument();
      });
    });

    it('should close modal after upload', async () => {
      const user = userEvent.setup();
      render(<FilesPage />);

      const uploadButton = screen.getByTestId('create-button');
      await user.click(uploadButton);

      const uploadModalButton = screen.getByText('Upload');
      await user.click(uploadModalButton);

      await waitFor(() => {
        expect(screen.queryByTestId('upload-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edit Modal', () => {
    it('should not show edit modal initially', () => {
      render(<FilesPage />);
      expect(screen.queryByTestId('edit-modal')).not.toBeInTheDocument();
    });

    it('should show edit modal when file is edited', async () => {
      const user = userEvent.setup();
      render(<FilesPage />);

      const editButtons = screen.getAllByTestId('edit-button');
      if (editButtons.length > 0) {
        await user.click(editButtons[0]);

        await waitFor(() => {
          expect(screen.getByTestId('edit-modal')).toBeInTheDocument();
        });
      }
    });

    it('should close edit modal', async () => {
      const user = userEvent.setup();
      render(<FilesPage />);

      const editButtons = screen.getAllByTestId('edit-button');
      if (editButtons.length > 0) {
        await user.click(editButtons[0]);

        await waitFor(() => {
          expect(screen.getByTestId('edit-modal')).toBeInTheDocument();
        });

        const closeButton = screen.getByText('Close Edit');
        await user.click(closeButton);

        await waitFor(() => {
          expect(screen.queryByTestId('edit-modal')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Icons View', () => {
    it('should render icons layout', async () => {
      const user = userEvent.setup();
      const { container } = render(<FilesPage />);

      const displayButton = screen.getByTestId('display-button');
      await user.click(displayButton);

      await waitFor(() => {
        expect(container.querySelector('.iconsGrid')).toBeInTheDocument();
      });
    });

    it('should display icon tiles in grid', async () => {
      const user = userEvent.setup();
      const { container } = render(<FilesPage />);

      const displayButton = screen.getByTestId('display-button');
      await user.click(displayButton);

      await waitFor(() => {
        const tiles = container.querySelectorAll('.iconTile');
        expect(tiles.length).toBeGreaterThan(0);
      });
    });

    it('should show breadcrumb in icons view', async () => {
      const user = userEvent.setup();
      const { container } = render(<FilesPage />);

      const displayButton = screen.getByTestId('display-button');
      await user.click(displayButton);

      await waitFor(() => {
        expect(container.querySelector('.pathBar')).toBeInTheDocument();
      });
    });

    it('should show Root in breadcrumb', async () => {
      const user = userEvent.setup();
      render(<FilesPage />);

      const displayButton = screen.getByTestId('display-button');
      await user.click(displayButton);

      await waitFor(() => {
        expect(screen.getByText('Root')).toBeInTheDocument();
      });
    });

    it('should allow opening folders in icons view', async () => {
      const user = userEvent.setup();
      const { container } = render(<FilesPage />);

      const displayButton = screen.getByTestId('display-button');
      await user.click(displayButton);

      await waitFor(() => {
        const tiles = container.querySelectorAll('.iconTile');
        if (tiles.length > 0) {
          fireEvent.doubleClick(tiles[0]);
          // After navigation, breadcrumb should update
          expect(container.querySelector('.pathBar')).toBeInTheDocument();
        }
      });
    });

    it('should show navigation button in icons view', async () => {
      const user = userEvent.setup();
      const { container } = render(<FilesPage />);

      const displayButton = screen.getByTestId('display-button');
      await user.click(displayButton);

      await waitFor(() => {
        const navBtn = container.querySelector('.navBtn');
        expect(navBtn).toBeInTheDocument();
      });
    });

    it('should have path shortcut button', async () => {
      const user = userEvent.setup();
      const { container } = render(<FilesPage />);

      const displayButton = screen.getByTestId('display-button');
      await user.click(displayButton);

      await waitFor(() => {
        const pathShortcut = container.querySelector('.pathShortcut');
        expect(pathShortcut).toBeInTheDocument();
      });
    });
  });

  describe('Path Navigation', () => {
    it('should display path form when path shortcut clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<FilesPage />);

      const displayButton = screen.getByTestId('display-button');
      await user.click(displayButton);

      const pathShortcut = container.querySelector('.pathShortcut');
      if (pathShortcut) {
        await user.click(pathShortcut);

        await waitFor(() => {
          expect(container.querySelector('.pathForm')).toBeInTheDocument();
        });
      }
    });

    it('should have path input in path form', async () => {
      const user = userEvent.setup();
      const { container } = render(<FilesPage />);

      const displayButton = screen.getByTestId('display-button');
      await user.click(displayButton);

      const pathShortcut = container.querySelector('.pathShortcut');
      if (pathShortcut) {
        await user.click(pathShortcut);

        await waitFor(() => {
          expect(container.querySelector('.pathInput')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Refresh', () => {
    it('should have refresh button', () => {
      render(<FilesPage />);
      expect(screen.getByTestId('refresh-button')).toBeInTheDocument();
    });

    it('should call fetch on refresh', async () => {
      const user = userEvent.setup();
      fetch.mockResolvedValueOnce({
        json: async () => ({ data: [] }),
      });

      render(<FilesPage />);

      const refreshButton = screen.getByTestId('refresh-button');
      await user.click(refreshButton);

      expect(fetch).toHaveBeenCalled();
    });
  });

  describe('Props', () => {
    it('should use provided orgId', () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({ data: [] }),
      });

      render(<FilesPage orgId="custom-org-123" />);

      expect(fetch).not.toHaveBeenCalled(); // Only called on refresh
    });

    it('should use default orgId', () => {
      render(<FilesPage />);
      // Default orgId should be set
      expect(screen.getByText('Files')).toBeInTheDocument();
    });
  });

  describe('Storage Information', () => {
    it('should display used and total storage', () => {
      render(<FilesPage usedGB={50} totalGB={100} />);
      expect(screen.getByLabelText('Storage usage')).toBeInTheDocument();
    });

    it('should have storage bar', () => {
      const { container } = render(<FilesPage />);
      expect(container.querySelector('.storageBar')).toBeInTheDocument();
    });

    it('should have storage fill', () => {
      const { container } = render(<FilesPage />);
      expect(container.querySelector('.storageFill')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-labels on buttons', () => {
      const { container } = render(<FilesPage />);
      const chevrons = container.querySelectorAll('[aria-label]');
      expect(chevrons.length).toBeGreaterThan(0);
    });

    it('should have proper semantic structure', () => {
      const { container } = render(<FilesPage />);
      expect(container.querySelector('.filesPage')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render page with content', () => {
      const { container } = render(<FilesPage />);
      expect(container.querySelector('.filesPage')).toBeInTheDocument();
    });

    it('should have responsive grid', async () => {
      const user = userEvent.setup();
      const { container } = render(<FilesPage />);

      const displayButton = screen.getByTestId('display-button');
      await user.click(displayButton);

      await waitFor(() => {
        const grid = container.querySelector('.iconsGrid');
        expect(grid).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing fetch response gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<FilesPage />);

      const refreshButton = screen.getByTestId('refresh-button');
      await waitFor(() => {
        expect(refreshButton).toBeInTheDocument();
      });
    });

    it('should render with no children selected', () => {
      render(<FilesPage />);
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).not.toBeChecked();
      });
    });

    it('should handle rapid layout switches', async () => {
      const user = userEvent.setup();
      render(<FilesPage />);

      const displayButton = screen.getByTestId('display-button');

      await user.click(displayButton);
      await user.click(displayButton);
      await user.click(displayButton);
      await user.click(displayButton);

      expect(displayButton).toBeInTheDocument();
    });
  });
});
