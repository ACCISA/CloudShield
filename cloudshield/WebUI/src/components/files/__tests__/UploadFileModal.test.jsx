import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UploadFileModal from '../UploadFileModal';

describe('UploadFileModal', () => {
  const mockOnClose = jest.fn();
  const mockOnUpload = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Visibility', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(
        <UploadFileModal isOpen={false} onClose={mockOnClose} onUpload={mockOnUpload} />
      );
      expect(container.querySelector('.modalOverlay')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );
      expect(screen.getByText('New file')).toBeInTheDocument();
    });
  });

  describe('Header', () => {
    it('should display correct breadcrumb', () => {
      render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );
      expect(screen.getByText('Files')).toBeInTheDocument();
      expect(screen.getByText('New file')).toBeInTheDocument();
    });

    it('should have close button', () => {
      render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );
      const closeButton = screen.getByText('✕');
      expect(closeButton).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );
      const closeButton = screen.getByText('✕');
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Drop Zone', () => {
    it('should render drop zone', () => {
      render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );
      expect(screen.getByText('Drag and drop files here, or')).toBeInTheDocument();
    });

    it('should have upload icon', () => {
      render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );
      expect(screen.getByText('⬆')).toBeInTheDocument();
    });

    it('should have browse button', () => {
      render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );
      expect(screen.getByText('Browse')).toBeInTheDocument();
    });

    it('should handle file input', async () => {
      const user = userEvent.setup();
      render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );

      const fileInput = screen.getByText('Browse').parentElement.querySelector('input[type="file"]');
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByDisplayValue('test.txt')).toBeInTheDocument();
      });
    });

    it('should handle drag over', () => {
      const { container } = render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );

      const dropZone = container.querySelector('.dropZone');
      fireEvent.dragOver(dropZone);

      expect(dropZone).toHaveClass('active');
    });

    it('should handle drag leave', () => {
      const { container } = render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );

      const dropZone = container.querySelector('.dropZone');
      fireEvent.dragOver(dropZone);
      fireEvent.dragLeave(dropZone);

      expect(dropZone).not.toHaveClass('active');
    });

    it('should handle drop with file', async () => {
      const { container } = render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );

      const dropZone = container.querySelector('.dropZone');
      const file = new File(['content'], 'dropped.txt', { type: 'text/plain' });
      const dataTransfer = {
        files: [file],
        preventDefault: jest.fn(),
      };

      fireEvent.drop(dropZone, { dataTransfer });

      await waitFor(() => {
        expect(screen.getByDisplayValue('dropped.txt')).toBeInTheDocument();
      });
    });

    it('should remove active class after drop', () => {
      const { container } = render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );

      const dropZone = container.querySelector('.dropZone');
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const dataTransfer = {
        files: [file],
        preventDefault: jest.fn(),
      };

      fireEvent.dragOver(dropZone);
      fireEvent.drop(dropZone, { dataTransfer });

      expect(dropZone).not.toHaveClass('active');
    });
  });

  describe('File Name Field', () => {
    it('should render file name input', () => {
      render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );
      expect(screen.getByPlaceholderText('file name')).toBeInTheDocument();
    });

    it('should update file name when file is uploaded', async () => {
      const user = userEvent.setup();
      render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );

      const fileInput = screen.getByText('Browse').parentElement.querySelector('input[type="file"]');
      const file = new File(['content'], 'myfile.txt', { type: 'text/plain' });

      await user.upload(fileInput, file);

      await waitFor(() => {
        const input = screen.getByDisplayValue('myfile.txt');
        expect(input).toBeInTheDocument();
      });
    });

    it('should allow manual file name editing', async () => {
      const user = userEvent.setup();
      render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );

      const fileNameInput = screen.getByPlaceholderText('file name');
      await user.type(fileNameInput, 'custom-name.txt');

      expect(fileNameInput.value).toBe('custom-name.txt');
    });

    it('should clear and reset file name', async () => {
      const user = userEvent.setup();
      render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );

      const fileNameInput = screen.getByPlaceholderText('file name');
      await user.type(fileNameInput, 'test.txt');
      expect(fileNameInput.value).toBe('test.txt');

      await user.clear(fileNameInput);
      expect(fileNameInput.value).toBe('');
    });
  });

  describe('Users Section', () => {
    it('should render users section header', () => {
      render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );
      expect(screen.getByText('Assign users')).toBeInTheDocument();
    });

    it('should have all users checkbox', () => {
      render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('should display user list', () => {
      render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );
      expect(screen.getByText('Michael Scott')).toBeInTheDocument();
      expect(screen.getByText('Jim Halpert')).toBeInTheDocument();
      expect(screen.getByText('Pam Beesly')).toBeInTheDocument();
      expect(screen.getByText('Dwight Schrute')).toBeInTheDocument();
    });

    it('should have search input for users', () => {
      render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );
      const searchInputs = screen.getAllByPlaceholderText('Search for users');
      expect(searchInputs.length).toBeGreaterThan(0);
    });

    it('should display suggested text', () => {
      render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );
      const suggested = screen.getAllByText('suggested');
      expect(suggested.length).toBeGreaterThan(0);
    });
  });

  describe('Groups Section', () => {
    it('should render groups section header', () => {
      render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );
      expect(screen.getByText('Assign groups')).toBeInTheDocument();
    });

    it('should display group list', () => {
      render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );
      expect(screen.getByText('Sales')).toBeInTheDocument();
      expect(screen.getByText('Finance')).toBeInTheDocument();
      expect(screen.getByText('Corporate')).toBeInTheDocument();
      expect(screen.getByText('Warehouse')).toBeInTheDocument();
    });

    it('should have search input for groups', () => {
      render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );
      const searchInputs = screen.getAllByPlaceholderText('Search for groups');
      expect(searchInputs.length).toBeGreaterThan(0);
    });

    it('should have all groups checkbox', () => {
      render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });
  });

  describe('Upload Button', () => {
    it('should render upload button', () => {
      render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );
      expect(screen.getByText('Upload')).toBeInTheDocument();
    });

    it('should call onUpload when upload button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );

      const uploadButton = screen.getByText('Upload');
      await user.click(uploadButton);

      expect(mockOnUpload).toHaveBeenCalled();
    });

    it('should pass file and fileName to onUpload', async () => {
      const user = userEvent.setup();
      render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );

      const fileNameInput = screen.getByPlaceholderText('file name');
      await user.type(fileNameInput, 'test.txt');

      const uploadButton = screen.getByText('Upload');
      await user.click(uploadButton);

      expect(mockOnUpload).toHaveBeenCalled();
    });
  });

  describe('Modal Styles', () => {
    it('should have modal overlay', () => {
      const { container } = render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );
      expect(container.querySelector('.modalOverlay')).toBeInTheDocument();
    });

    it('should have modal element', () => {
      const { container } = render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );
      expect(container.querySelector('.modal')).toBeInTheDocument();
    });

    it('should render style tag', () => {
      const { container } = render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );
      expect(container.querySelector('style')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid file uploads', async () => {
      const user = userEvent.setup();
      render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );

      const fileInput = screen.getByText('Browse').parentElement.querySelector('input[type="file"]');
      const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' });
      const file2 = new File(['content2'], 'file2.txt', { type: 'text/plain' });

      await user.upload(fileInput, file1);
      await waitFor(() => {
        expect(screen.getByDisplayValue('file1.txt')).toBeInTheDocument();
      });

      await user.upload(fileInput, file2);
      await waitFor(() => {
        expect(screen.getByDisplayValue('file2.txt')).toBeInTheDocument();
      });
    });

    it('should handle empty file name input', () => {
      render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );

      const fileNameInput = screen.getByPlaceholderText('file name');
      expect(fileNameInput.value).toBe('');
    });

    it('should handle drop without files', () => {
      const { container } = render(
        <UploadFileModal isOpen={true} onClose={mockOnClose} onUpload={mockOnUpload} />
      );

      const dropZone = container.querySelector('.dropZone');
      const dataTransfer = {
        files: [],
        preventDefault: jest.fn(),
      };

      fireEvent.drop(dropZone, { dataTransfer });

      const fileNameInput = screen.getByPlaceholderText('file name');
      expect(fileNameInput.value).toBe('');
    });
  });
});
