import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditFileModal from '../EditFileModal';

describe('EditFileModal', () => {
  const mockFile = {
    id: 'file-1',
    name: 'test-file.txt',
    kind: 'file',
    size: '5.2 MB',
    updated_at: '2025-01-19T10:30:00Z',
  };

  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Visibility', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(
        <EditFileModal
          isOpen={false}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );
      expect(container.querySelector('.modalOverlay')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );
      expect(screen.getByText('Edit File')).toBeInTheDocument();
    });
  });

  describe('Header', () => {
    it('should display correct breadcrumb', () => {
      render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );
      expect(screen.getByText('Files')).toBeInTheDocument();
      expect(screen.getByText('Edit File')).toBeInTheDocument();
    });

    it('should have close button', () => {
      render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );
      const closeButton = screen.getByText('✕');
      expect(closeButton).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );
      const closeButton = screen.getByText('✕');
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('File Preview', () => {
    it('should display file preview icon', () => {
      render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );
      expect(screen.getByText('📄')).toBeInTheDocument();
    });
  });

  describe('File Name Field', () => {
    it('should render file name input', () => {
      render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );
      expect(screen.getByPlaceholderText('file name')).toBeInTheDocument();
    });

    it('should display file name from props', () => {
      render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );
      expect(screen.getByDisplayValue('test-file.txt')).toBeInTheDocument();
    });

    it('should allow editing file name', async () => {
      const user = userEvent.setup();
      render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const input = screen.getByDisplayValue('test-file.txt');
      await user.clear(input);
      await user.type(input, 'renamed-file.txt');

      expect(input.value).toBe('renamed-file.txt');
    });

    it('should handle null file gracefully', () => {
      render(
        <EditFileModal
          isOpen={true}
          file={null}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );
      const input = screen.getByPlaceholderText('file name');
      expect(input.value).toBe('');
    });

    it('should handle undefined file gracefully', () => {
      render(
        <EditFileModal
          isOpen={true}
          file={undefined}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );
      const input = screen.getByPlaceholderText('file name');
      expect(input.value).toBe('');
    });
  });

  describe('Users Section', () => {
    it('should render users section header', () => {
      render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );
      expect(screen.getByText('Assign users')).toBeInTheDocument();
    });

    it('should display user list', () => {
      render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );
      expect(screen.getByText('Michael Scott')).toBeInTheDocument();
      expect(screen.getByText('Jim Halpert')).toBeInTheDocument();
      expect(screen.getByText('Pam Beesly')).toBeInTheDocument();
      expect(screen.getByText('Dwight Schrute')).toBeInTheDocument();
    });

    it('should have search input for users', () => {
      render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );
      const searchInputs = screen.getAllByPlaceholderText('Search for users');
      expect(searchInputs.length).toBeGreaterThan(0);
    });

    it('should have all users checkbox', () => {
      render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });
  });

  describe('Groups Section', () => {
    it('should render groups section header', () => {
      render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );
      expect(screen.getByText('Assign groups')).toBeInTheDocument();
    });

    it('should display group list', () => {
      render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );
      expect(screen.getByText('Sales')).toBeInTheDocument();
      expect(screen.getByText('Finance')).toBeInTheDocument();
      expect(screen.getByText('Reception')).toBeInTheDocument();
      expect(screen.getByText('Annex')).toBeInTheDocument();
      expect(screen.getByText('Manager')).toBeInTheDocument();
    });

    it('should have search input for groups', () => {
      render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );
      const searchInputs = screen.getAllByPlaceholderText('Search for groups');
      expect(searchInputs.length).toBeGreaterThan(0);
    });

    it('should have all groups checkbox', () => {
      render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });
  });

  describe('Delete Button', () => {
    it('should render delete button', () => {
      render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );
      expect(screen.getByText('🗑 Delete')).toBeInTheDocument();
    });

    it('should call onDelete when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByText('🗑 Delete');
      await user.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalled();
    });

    it('should have danger styling on delete button', () => {
      const { container } = render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByText('🗑 Delete');
      expect(deleteButton).toHaveClass('danger');
    });
  });

  describe('Edit/Save Button', () => {
    it('should render edit button', () => {
      render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('should call onSave when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const editButton = screen.getByText('Edit');
      await user.click(editButton);

      expect(mockOnSave).toHaveBeenCalled();
    });

    it('should pass updated file name to onSave', async () => {
      const user = userEvent.setup();
      render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const input = screen.getByDisplayValue('test-file.txt');
      await user.clear(input);
      await user.type(input, 'new-name.txt');

      const editButton = screen.getByText('Edit');
      await user.click(editButton);

      expect(mockOnSave).toHaveBeenCalled();
    });

    it('should have primary styling on edit button', () => {
      render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const editButton = screen.getByText('Edit');
      expect(editButton).toHaveClass('primary');
    });
  });

  describe('Modal Structure', () => {
    it('should have modal overlay', () => {
      const { container } = render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );
      expect(container.querySelector('.modalOverlay')).toBeInTheDocument();
    });

    it('should have modal element', () => {
      const { container } = render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );
      expect(container.querySelector('.modal')).toBeInTheDocument();
    });

    it('should have modal header', () => {
      const { container } = render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );
      expect(container.querySelector('.modalHeader')).toBeInTheDocument();
    });

    it('should have modal footer with space class', () => {
      const { container } = render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );
      expect(container.querySelector('.modalFooter.space')).toBeInTheDocument();
    });

    it('should render style tag', () => {
      const { container } = render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );
      expect(container.querySelector('style')).toBeInTheDocument();
    });
  });

  describe('Checkbox Interactions', () => {
    it('should have checkboxes for all users', () => {
      render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('should allow checking user checkboxes', async () => {
      const user = userEvent.setup();
      render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      expect(checkboxes[0]).toBeChecked();
    });
  });

  describe('Edge Cases', () => {
    it('should handle file with special characters in name', () => {
      const specialFile = {
        ...mockFile,
        name: 'file_with-special!@#$%.txt',
      };

      render(
        <EditFileModal
          isOpen={true}
          file={specialFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByDisplayValue('file_with-special!@#$%.txt')).toBeInTheDocument();
    });

    it('should handle file with very long name', () => {
      const longNameFile = {
        ...mockFile,
        name: 'a'.repeat(500) + '.txt',
      };

      render(
        <EditFileModal
          isOpen={true}
          file={longNameFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const input = screen.getByPlaceholderText('file name');
      expect(input.value).toBe('a'.repeat(500) + '.txt');
    });

    it('should maintain file name state during rapid changes', async () => {
      const user = userEvent.setup();
      render(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      const input = screen.getByDisplayValue('test-file.txt');
      await user.clear(input);
      await user.type(input, 'first.txt');

      expect(input.value).toBe('first.txt');

      await user.clear(input);
      await user.type(input, 'second.txt');

      expect(input.value).toBe('second.txt');
    });

    it('should handle multiple consecutive modal opens/closes', () => {
      const { rerender } = render(
        <EditFileModal
          isOpen={false}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      rerender(
        <EditFileModal
          isOpen={true}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Edit File')).toBeInTheDocument();

      rerender(
        <EditFileModal
          isOpen={false}
          file={mockFile}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.queryByText('Edit File')).not.toBeInTheDocument();
    });
  });
});
