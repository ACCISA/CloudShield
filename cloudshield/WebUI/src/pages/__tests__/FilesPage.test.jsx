import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilesPage from '../FilesPage';

// Mock fetch
global.fetch = jest.fn();

// Mock child components with proper prop passing
jest.mock('../../components/common/SearchField/SearchField', () => ({
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

jest.mock('../../components/common/DisplayButton/DisplayButton', () => ({
  __esModule: true,
  default: ({ layout, onLayoutChange, style }) => (
    <button
      onClick={() => onLayoutChange(layout === 'list' ? 'icons' : 'list')}
      data-testid="display-button"
      style={style}
    >
      {layout}
    </button>
  ),
}));

jest.mock('../../components/common/RefreshButton/RefreshButton', () => ({
  __esModule: true,
  default: ({ onClick }) => (
    <button onClick={onClick} data-testid="refresh-button">
      Refresh
    </button>
  ),
}));

jest.mock('../../components/common/CreateButton/CreateButton', () => ({
  __esModule: true,
  default: ({ buttonText, onClick }) => (
    <button onClick={onClick} data-testid="create-button">
      {buttonText}
    </button>
  ),
}));

jest.mock('../../components/common/Checkbox/Checkbox', () => ({
  __esModule: true,
  default: ({ checked, onChange }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      data-testid="checkbox"
    />
  ),
}));

jest.mock('../../components/common/EditButton/EditButton', () => ({
  __esModule: true,
  default: ({ menuItems }) => (
    <button data-testid="edit-button">
      {menuItems && menuItems.length > 0 ? 'Edit' : 'Menu'}
    </button>
  ),
}));

jest.mock('../../components/files/UploadFileModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose, onUpload }) => (
    isOpen ? (
      <div data-testid="upload-modal">
        <button onClick={onClose} data-testid="upload-close">Close</button>
        <button onClick={() => onUpload?.({ file: null, fileName: '' })} data-testid="upload-button">Upload</button>
      </div>
    ) : null
  ),
}));

jest.mock('../../components/files/EditFileModal', () => ({
  __esModule: true,
  default: ({ isOpen, file, onClose, onSave, onDelete }) => (
    isOpen ? (
      <div data-testid="edit-modal">
        <div data-testid="edit-file-name">{file?.name}</div>
        <button onClick={onClose} data-testid="edit-close">Close</button>
        <button onClick={() => onSave?.({ name: file?.name })} data-testid="edit-save">Save</button>
        <button onClick={() => onDelete?.()} data-testid="edit-delete">Delete</button>
      </div>
    ) : null
  ),
}));

describe('FilesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<FilesPage />);
      expect(container.querySelector('.filesPage')).toBeInTheDocument();
    });

    it('should render page title', () => {
      const { container } = render(<FilesPage />);
      const title = container.querySelector('.title');
      expect(title).toHaveTextContent('Files');
    });

    it('should render page subtitle', () => {
      const { container } = render(<FilesPage />);
      const subtitle = container.querySelector('.subtitle');
      expect(subtitle).toHaveTextContent('Browse and manage your organization files');
    });

    it('should render top bar section', () => {
      const { container } = render(<FilesPage />);
      expect(container.querySelector('.topBar')).toBeInTheDocument();
    });

    it('should render toolbar section', () => {
      const { container } = render(<FilesPage />);
      expect(container.querySelector('.toolbar')).toBeInTheDocument();
    });
  });

  describe('Storage Pill Component', () => {
    it('should render storage pill', () => {
      const { container } = render(<FilesPage />);
      const storagePill = container.querySelector('.storagePill');
      expect(storagePill).toBeInTheDocument();
      expect(storagePill).toHaveAttribute('aria-label', 'Storage usage');
    });

    it('should display default storage values (62GB / 100GB)', () => {
      const { container } = render(<FilesPage />);
      expect(container.textContent).toContain('62GB');
      expect(container.textContent).toContain('100GB');
    });

    it('should render storage label', () => {
      const { container } = render(<FilesPage />);
      expect(container.textContent).toContain('Storage');
    });

    it('should render storage bar', () => {
      const { container } = render(<FilesPage />);
      expect(container.querySelector('.storageBar')).toBeInTheDocument();
    });

    it('should render storage fill element', () => {
      const { container } = render(<FilesPage />);
      expect(container.querySelector('.storageFill')).toBeInTheDocument();
    });

    it('should calculate correct storage percentage', () => {
      const { container } = render(<FilesPage />);
      const fill = container.querySelector('.storageFill');
      const width = fill.style.width;
      expect(width).toBe('62%');
    });

    it('should cap storage percentage at 100%', () => {
      const { container } = render(<FilesPage usedGB={150} totalGB={100} />);
      const fill = container.querySelector('.storageFill');
      expect(fill.style.width).toBe('100%');
    });

    it('should handle zero storage', () => {
      const { container } = render(<FilesPage usedGB={0} totalGB={100} />);
      const fill = container.querySelector('.storageFill');
      expect(fill.style.width).toBe('0%');
    });

    it('should handle negative used storage', () => {
      const { container } = render(<FilesPage usedGB={-10} totalGB={100} />);
      const fill = container.querySelector('.storageFill');
      expect(fill.style.width).toBe('0%');
    });

    it('should render storage text container', () => {
      const { container } = render(<FilesPage />);
      expect(container.querySelector('.storageText')).toBeInTheDocument();
    });
  });

  describe('Toolbar Controls', () => {
    it('should render search field', () => {
      const { getByTestId } = render(<FilesPage />);
      expect(getByTestId('search-field')).toBeInTheDocument();
    });

    it('should render display button', () => {
      const { getByTestId } = render(<FilesPage />);
      expect(getByTestId('display-button')).toBeInTheDocument();
    });

    it('should render refresh button', () => {
      const { getByTestId } = render(<FilesPage />);
      expect(getByTestId('refresh-button')).toBeInTheDocument();
    });

    it('should render create button with "Upload" text', () => {
      const { getByTestId } = render(<FilesPage />);
      const createButton = getByTestId('create-button');
      expect(createButton).toBeInTheDocument();
      expect(createButton).toHaveTextContent('Upload');
    });

    it('should render left tools section', () => {
      const { container } = render(<FilesPage />);
      expect(container.querySelector('.leftTools')).toBeInTheDocument();
    });

    it('should render right tools section', () => {
      const { container } = render(<FilesPage />);
      expect(container.querySelector('.rightTools')).toBeInTheDocument();
    });
  });

  describe('List Layout', () => {
    it('should render table by default', () => {
      const { container } = render(<FilesPage />);
      expect(container.querySelector('.table')).toBeInTheDocument();
    });

    it('should render table header', () => {
      const { container } = render(<FilesPage />);
      const header = container.querySelector('.header');
      expect(header).toBeInTheDocument();
    });

    it('should render table rows', () => {
      const { container } = render(<FilesPage />);
      const rows = container.querySelectorAll('.row');
      expect(rows.length).toBeGreaterThan(0);
    });

    it('should display file names in list', () => {
      const { container } = render(<FilesPage />);
      expect(container.textContent).toContain('sales_docs');
      expect(container.textContent).toContain('sales_docs.docx');
    });

    it('should display file size for files', () => {
      const { container } = render(<FilesPage />);
      expect(container.textContent).toContain('16.5 MB');
    });

    it('should render checkboxes in list', () => {
      const { container } = render(<FilesPage />);
      const checkboxes = container.querySelectorAll('[data-testid="checkbox"]');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('should render edit buttons in list rows', () => {
      const { container } = render(<FilesPage />);
      const editButtons = container.querySelectorAll('[data-testid="edit-button"]');
      expect(editButtons.length).toBeGreaterThan(0);
    });

    it('should render name cells with proper structure', () => {
      const { container } = render(<FilesPage />);
      const nameCells = container.querySelectorAll('.nameCell');
      expect(nameCells.length).toBeGreaterThan(0);
    });

    it('should render chevron buttons for folders', () => {
      const { container } = render(<FilesPage />);
      const chevrons = container.querySelectorAll('.chevBtn');
      expect(chevrons.length).toBeGreaterThan(0);
    });

    it('should render meta information columns', () => {
      const { container } = render(<FilesPage />);
      const metaCells = container.querySelectorAll('.meta');
      expect(metaCells.length).toBeGreaterThan(0);
    });

    it('should render groups display', () => {
      const { container } = render(<FilesPage />);
      const groupsContainers = container.querySelectorAll('.groups');
      expect(groupsContainers.length).toBeGreaterThan(0);
    });
  });

  describe('Search Functionality', () => {
    it('should render search field', () => {
      const { getByTestId } = render(<FilesPage />);
      const searchField = getByTestId('search-field');
      expect(searchField).toBeInTheDocument();
    });

    it('should accept search input', async () => {
      const user = userEvent.setup();
      const { getByTestId } = render(<FilesPage />);
      const searchField = getByTestId('search-field');

      await user.type(searchField, 'test');
      expect(searchField.value).toBe('test');
    });

    it('should clear search input', async () => {
      const user = userEvent.setup();
      const { getByTestId } = render(<FilesPage />);
      const searchField = getByTestId('search-field');

      await user.type(searchField, 'test');
      await user.clear(searchField);
      expect(searchField.value).toBe('');
    });

    it('should have correct placeholder text', () => {
      const { getByTestId } = render(<FilesPage />);
      const searchField = getByTestId('search-field');
      expect(searchField).toHaveAttribute('placeholder', 'Search files');
    });
  });

  describe('Layout Switching', () => {
    it('should start in list layout', () => {
      const { container } = render(<FilesPage />);
      expect(container.querySelector('.table')).toBeInTheDocument();
    });

    it('should switch to icons layout when button clicked', async () => {
      const user = userEvent.setup();
      const { container, getByTestId } = render(<FilesPage />);

      const displayButton = getByTestId('display-button');
      await user.click(displayButton);

      await waitFor(() => {
        expect(container.querySelector('.iconsGrid')).toBeInTheDocument();
      });
    });

    it('should switch back to list layout', async () => {
      const user = userEvent.setup();
      const { container, getByTestId } = render(<FilesPage />);

      const displayButton = getByTestId('display-button');
      await user.click(displayButton);
      await user.click(displayButton);

      await waitFor(() => {
        expect(container.querySelector('.table')).toBeInTheDocument();
      });
    });
  });

  describe('Icons View Layout', () => {
    it('should render icons grid when in icons layout', async () => {
      const user = userEvent.setup();
      const { container, getByTestId } = render(<FilesPage />);

      const displayButton = getByTestId('display-button');
      await user.click(displayButton);

      await waitFor(() => {
        expect(container.querySelector('.iconsGrid')).toBeInTheDocument();
      });
    });

    it('should render path bar in icons view', async () => {
      const user = userEvent.setup();
      const { container, getByTestId } = render(<FilesPage />);

      const displayButton = getByTestId('display-button');
      await user.click(displayButton);

      await waitFor(() => {
        expect(container.querySelector('.pathBar')).toBeInTheDocument();
      });
    });

    it('should render icon tiles', async () => {
      const user = userEvent.setup();
      const { container, getByTestId } = render(<FilesPage />);

      const displayButton = getByTestId('display-button');
      await user.click(displayButton);

      await waitFor(() => {
        const tiles = container.querySelectorAll('.iconTile');
        expect(tiles.length).toBeGreaterThan(0);
      });
    });

    it('should render breadcrumb in icons view', async () => {
      const user = userEvent.setup();
      const { container, getByTestId } = render(<FilesPage />);

      const displayButton = getByTestId('display-button');
      await user.click(displayButton);

      await waitFor(() => {
        expect(container.querySelector('.crumbs')).toBeInTheDocument();
      });
    });

    it('should show Root in breadcrumb', async () => {
      const user = userEvent.setup();
      const { getByTestId, container } = render(<FilesPage />);

      const displayButton = getByTestId('display-button');
      await user.click(displayButton);

      await waitFor(() => {
        const pathBar = container.querySelector('.pathBar');
        expect(pathBar).toBeInTheDocument();
        expect(pathBar.textContent).toContain('Root');
      });
    });

    it('should render navigation button', async () => {
      const user = userEvent.setup();
      const { container, getByTestId } = render(<FilesPage />);

      const displayButton = getByTestId('display-button');
      await user.click(displayButton);

      await waitFor(() => {
        expect(container.querySelector('.navBtn')).toBeInTheDocument();
      });
    });

    it('should render path shortcut button', async () => {
      const user = userEvent.setup();
      const { container, getByTestId } = render(<FilesPage />);

      const displayButton = getByTestId('display-button');
      await user.click(displayButton);

      await waitFor(() => {
        expect(container.querySelector('.pathShortcut')).toBeInTheDocument();
      });
    });
  });

  describe('Upload Modal', () => {
    it('should not show upload modal initially', () => {
      const { queryByTestId } = render(<FilesPage />);
      expect(queryByTestId('upload-modal')).not.toBeInTheDocument();
    });

    it('should show upload modal when create button clicked', async () => {
      const user = userEvent.setup();
      const { getByTestId } = render(<FilesPage />);

      const createButton = getByTestId('create-button');
      await user.click(createButton);

      await waitFor(() => {
        expect(getByTestId('upload-modal')).toBeInTheDocument();
      });
    });

    it('should close upload modal on close button click', async () => {
      const user = userEvent.setup();
      const { getByTestId, queryByTestId } = render(<FilesPage />);

      const createButton = getByTestId('create-button');
      await user.click(createButton);

      const closeButton = getByTestId('upload-close');
      await user.click(closeButton);

      await waitFor(() => {
        expect(queryByTestId('upload-modal')).not.toBeInTheDocument();
      });
    });

    it('should close upload modal after successful upload', async () => {
      const user = userEvent.setup();
      const { getByTestId, queryByTestId } = render(<FilesPage />);

      const createButton = getByTestId('create-button');
      await user.click(createButton);

      const uploadButton = getByTestId('upload-button');
      await user.click(uploadButton);

      await waitFor(() => {
        expect(queryByTestId('upload-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edit Modal', () => {
    it('should not show edit modal initially', () => {
      const { queryByTestId } = render(<FilesPage />);
      expect(queryByTestId('edit-modal')).not.toBeInTheDocument();
    });

    it('should render edit button in each row', () => {
      const { container } = render(<FilesPage />);
      const editButtons = container.querySelectorAll('[data-testid="edit-button"]');
      expect(editButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Folder Expansion', () => {
    it('should have chevron buttons for folders', () => {
      const { container } = render(<FilesPage />);
      const chevrons = container.querySelectorAll('.chevBtn');
      expect(chevrons.length).toBeGreaterThan(0);
    });

    it('should toggle folder expansion on chevron click', async () => {
      const user = userEvent.setup();
      const { container } = render(<FilesPage />);

      const chevrons = container.querySelectorAll('.chevBtn');
      const initialRowCount = container.querySelectorAll('.row').length;

      if (chevrons.length > 0) {
        await user.click(chevrons[0]);

        await waitFor(() => {
          const newRowCount = container.querySelectorAll('.row').length;
          expect(newRowCount).not.toBe(initialRowCount);
        });
      }
    });

    it('should have aria-label on chevron buttons', () => {
      const { container } = render(<FilesPage />);
      const chevrons = container.querySelectorAll('.chevBtn');
      expect(chevrons[0]).toHaveAttribute('aria-label');
    });
  });

  describe('Props', () => {
    it('should accept orgId prop', () => {
      const { container } = render(<FilesPage orgId="custom-org" />);
      expect(container.querySelector('.filesPage')).toBeInTheDocument();
    });

    it('should use default orgId when not provided', () => {
      const { container } = render(<FilesPage />);
      expect(container.querySelector('.filesPage')).toBeInTheDocument();
    });

    it('should render with static storage values', () => {
      const { container } = render(<FilesPage />);
      const fill = container.querySelector('.storageFill');
      expect(fill.style.width).toBe('62%');
    });
  });

  describe('Styling', () => {
    it('should have inline style tag', () => {
      const { container } = render(<FilesPage />);
      const styleTag = container.querySelector('style');
      expect(styleTag).toBeInTheDocument();
    });

    it('should include filesPage styles', () => {
      const { container } = render(<FilesPage />);
      const styleTag = container.querySelector('style');
      expect(styleTag.textContent).toContain('.filesPage');
    });

    it('should include table styles', () => {
      const { container } = render(<FilesPage />);
      const styleTag = container.querySelector('style');
      expect(styleTag.textContent).toContain('.table');
    });

    it('should include icons grid styles', () => {
      const { container } = render(<FilesPage />);
      const styleTag = container.querySelector('style');
      expect(styleTag.textContent).toContain('.iconsGrid');
    });

    it('should include responsive media queries', () => {
      const { container } = render(<FilesPage />);
      const styleTag = container.querySelector('style');
      expect(styleTag.textContent).toContain('@media');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label on storage pill', () => {
      const { container } = render(<FilesPage />);
      const storagePill = container.querySelector('.storagePill');
      expect(storagePill).toHaveAttribute('aria-label', 'Storage usage');
    });

    it('should have semantic structure', () => {
      const { container } = render(<FilesPage />);
      expect(container.querySelector('.filesPage')).toBeInTheDocument();
      expect(container.querySelector('.topBar')).toBeInTheDocument();
      expect(container.querySelector('.toolbar')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should render with no props', () => {
      const { container } = render(<FilesPage />);
      expect(container.querySelector('.filesPage')).toBeInTheDocument();
    });

    it('should handle remounting', () => {
      const { unmount, container } = render(<FilesPage />);
      expect(container.querySelector('.filesPage')).toBeInTheDocument();
      unmount();
      const { container: newContainer } = render(<FilesPage />);
      expect(newContainer.querySelector('.filesPage')).toBeInTheDocument();
    });

    it('should handle rapid prop updates', () => {
      const { rerender, container } = render(<FilesPage usedGB={10} totalGB={100} />);
      rerender(<FilesPage usedGB={50} totalGB={100} />);
      rerender(<FilesPage usedGB={90} totalGB={100} />);
      expect(container.querySelector('.filesPage')).toBeInTheDocument();
    });

    it('should have file tree data present', () => {
      const { container } = render(<FilesPage />);
      const rows = container.querySelectorAll('.row');
      expect(rows.length).toBeGreaterThan(0);
    });

    it('should handle search and layout switch combination', async () => {
      const user = userEvent.setup();
      const { getByTestId, container } = render(<FilesPage />);

      const searchField = getByTestId('search-field');
      await user.type(searchField, 'sales');

      const displayButton = getByTestId('display-button');
      await user.click(displayButton);

      await waitFor(() => {
        expect(container.querySelector('.iconsGrid')).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should have refresh button', () => {
      const { getByTestId } = render(<FilesPage />);
      expect(getByTestId('refresh-button')).toBeInTheDocument();
    });

    it('should call refresh button on click', async () => {
      const user = userEvent.setup();
      fetch.mockResolvedValueOnce({
        json: async () => ({ data: [] }),
      });

      const { getByTestId } = render(<FilesPage />);
      const refreshButton = getByTestId('refresh-button');

      await user.click(refreshButton);
      expect(fetch).toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', async () => {
      const user = userEvent.setup();
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const { getByTestId, container } = render(<FilesPage />);
      const refreshButton = getByTestId('refresh-button');

      await user.click(refreshButton);

      await waitFor(() => {
        expect(container.querySelector('.filesPage')).toBeInTheDocument();
      });
    });
  });
});
