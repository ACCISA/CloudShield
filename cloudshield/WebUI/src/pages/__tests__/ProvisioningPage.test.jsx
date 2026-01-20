import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import ProvisioningPage from '../ProvisioningPage';

// Mock dependencies
jest.mock('../../components/provisioning/ProvisioningControls', () => {
  return function MockProvisioningControls({ status, jobId, message, progress }) {
    return (
      <div data-testid="provisioning-controls">
        <div data-testid="controls-status">{status}</div>
        <div data-testid="controls-job-id">{jobId || 'none'}</div>
        <div data-testid="controls-message">{message || 'none'}</div>
        <div data-testid="controls-progress">{progress !== null ? progress : 'none'}</div>
      </div>
    );
  };
});

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

import { useAuth } from '../../context/AuthContext';

describe('ProvisioningPage', () => {
  let mockFetch;
  let mockOnProvisioned;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    
    mockOnProvisioned = jest.fn();
    
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.getItem = jest.fn().mockReturnValue('test-org-123');
    
    useAuth.mockReturnValue({
      currentUser: { org_id: 'test-org-123' },
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const renderProvisioningPage = (props = {}) => {
    return render(
      <BrowserRouter>
        <ProvisioningPage onProvisioned={mockOnProvisioned} {...props} />
      </BrowserRouter>
    );
  };

  it('renders provisioning page with org id from localStorage', () => {
    renderProvisioningPage();

    expect(screen.getByText('Provisioning')).toBeInTheDocument();
    expect(screen.getByText(/Org ID:/)).toBeInTheDocument();
    expect(screen.getByText('test-org-123')).toBeInTheDocument();
  });

  it('uses currentUser org_id as fallback when localStorage is empty', () => {
    Storage.prototype.getItem.mockReturnValue(null);
    
    renderProvisioningPage();

    expect(screen.getByText('test-org-123')).toBeInTheDocument();
  });

  it('uses default-org when no org_id is available', () => {
    Storage.prototype.getItem.mockReturnValue(null);
    useAuth.mockReturnValue({ currentUser: null });
    
    renderProvisioningPage();

    expect(screen.getByText('default-org')).toBeInTheDocument();
  });

  it('auto-starts provisioning on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({ job_id: 'job-123' }),
    });

    renderProvisioningPage();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://172.18.0.3:5050/task/provision',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ org_id: 'test-org-123' }),
        }
      );
    });
  });

  it('starts polling after provisioning starts', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ job_id: 'job-123' }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'running',
          message: 'Provisioning in progress',
          progress: 50,
        }),
      });

    renderProvisioningPage();

    await waitFor(() => {
      expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/status/job-123');
    });
  });

  it('updates status and progress during polling', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ job_id: 'job-123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'running',
          message: 'Step 1 of 3',
          progress: 33,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'running',
          message: 'Step 2 of 3',
          progress: 66,
        }),
      });

    renderProvisioningPage();

    await waitFor(() => {
      expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('controls-message')).toHaveTextContent('Step 1 of 3');
      expect(screen.getByTestId('controls-progress')).toHaveTextContent('33');
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('controls-message')).toHaveTextContent('Step 2 of 3');
      expect(screen.getByTestId('controls-progress')).toHaveTextContent('66');
    });
  });

  it('stops polling and navigates on success', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ job_id: 'job-123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'succeeded',
          message: 'Provisioning complete',
          progress: 100,
        }),
      });

    renderProvisioningPage();

    await waitFor(() => {
      expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('controls-status')).toHaveTextContent('succeeded');
    });

    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith('isProvisioned', 'true');
      expect(mockOnProvisioned).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('handles provisioning failure', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ job_id: 'job-123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'failed',
          message: 'Provisioning failed: timeout',
        }),
      });

    renderProvisioningPage();

    await waitFor(() => {
      expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('controls-status')).toHaveTextContent('failed');
      expect(screen.getByText(/Failed/)).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('resets provisioning state when reset button is clicked', async () => {
    // Auto-start will be triggered immediately (first call)
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ job_id: 'job-123' }),
      })
      // After reset, auto-start will trigger again (second call)
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ job_id: 'job-456' }),
      });

    renderProvisioningPage();

    // Wait for first auto-start to complete
    await waitFor(() => {
      expect(screen.getByTestId('controls-status')).toHaveTextContent('running');
      expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
    });

    const resetButton = screen.getByRole('button', { name: /Reset/ });
    
    // Reset triggers auto-start again with a new job
    fireEvent.click(resetButton);

    // Verify that a new provisioning job started with different job_id
    await waitFor(() => {
      expect(screen.getByTestId('controls-status')).toHaveTextContent('running');
      expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-456');
    });
    
    // Verify second fetch was called (for the reset auto-start)
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('handles error starting provisioning', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    renderProvisioningPage();

    await waitFor(() => {
      expect(screen.getByTestId('controls-status')).toHaveTextContent('failed');
      expect(screen.getByTestId('controls-message')).toHaveTextContent('Network error');
    });
  });

  it('handles missing job_id in response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({}),
    });

    renderProvisioningPage();

    await waitFor(() => {
      expect(screen.getByTestId('controls-status')).toHaveTextContent('failed');
      expect(screen.getByTestId('controls-message')).toHaveTextContent(/missing job_id/);
    });
  });

  it('cleans up polling timer on unmount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({ job_id: 'job-123' }),
    });

    const { unmount } = renderProvisioningPage();

    await waitFor(() => {
      expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
    });

    unmount();

    const callCount = mockFetch.mock.calls.length;
    
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(mockFetch.mock.calls.length).toBe(callCount);
  });

  it('shows determinate progress when progress is a number', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ job_id: 'job-123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'running',
          progress: 75,
        }),
      });

    renderProvisioningPage();

    await waitFor(() => {
      expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(screen.getByText(/Provisioning… 75%/)).toBeInTheDocument();
    });
  });

  it('infers status from progress text when status is missing', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ job_id: 'job-123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          progress: 'Failed: unable to allocate resources',
        }),
      });

    renderProvisioningPage();

    await waitFor(() => {
      expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('controls-status')).toHaveTextContent('failed');
    });
  });

  it('handles missing onProvisioned callback', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ job_id: 'job-123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'succeeded',
        }),
      });

    render(
      <BrowserRouter>
        <ProvisioningPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('handles localStorage error when retrieving org_id', async () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('localStorage error');
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({ job_id: 'job-123' }),
    });

    renderProvisioningPage();

    await waitFor(() => {
      expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
    });

    getItemSpy.mockRestore();
  });

  it('uses currentUser.org_id when orgId is not set', async () => {
    localStorage.removeItem('org_id');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({ job_id: 'job-123' }),
    });

    render(
      <BrowserRouter>
        <ProvisioningPage currentUser={{ org_id: 'user-org-123' }} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
    });
  });

  it('uses default-org when no org_id is available', async () => {
    Storage.prototype.getItem.mockReturnValue(null);
    useAuth.mockReturnValue({
      currentUser: null,
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({ job_id: 'job-456' }),
    });

    render(
      <BrowserRouter>
        <ProvisioningPage />
      </BrowserRouter>
    );

    // Should use default-org and auto-start
    await waitFor(() => {
      expect(screen.getByText('default-org')).toBeInTheDocument();
      expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-456');
    });
  });

  it('handles non-202 status code error when starting provision', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Server error',
    });

    renderProvisioningPage();

    await waitFor(() => {
      expect(screen.getByTestId('controls-status')).toHaveTextContent('failed');
      expect(screen.getByTestId('controls-message')).toHaveTextContent('Server error');
    });
  });

  it('handles error response when fetching status', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ job_id: 'job-123' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Job not found',
      });

    renderProvisioningPage();

    await waitFor(() => {
      expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('controls-message')).toHaveTextContent('Job not found');
    });
  });

  it('infers succeeded status from progress text containing "completed"', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ job_id: 'job-123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          progress: 'Provisioning completed successfully',
        }),
      });

    renderProvisioningPage();

    await waitFor(() => {
      expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('controls-status')).toHaveTextContent('succeeded');
    });

    renderWithRouter(<ProvisioningPage />);
    
    const orgIdInput = screen.getByLabelText(/Organization ID/i);
    fireEvent.change(orgIdInput, { target: { value: 'TEST_STATUS_ERR' } });
    fireEvent.click(screen.getByRole('button', { name: /start provisioning/i }));

    await waitFor(() => 
      expect(screen.getByText(/Job ID:\s*J-STATUS-ERR/i)).toBeInTheDocument()
    );

    // Advance timer to trigger polling
    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    // Should show polling error
    await waitFor(() => {
      expect(screen.queryByText(/error/i)).toBeInTheDocument();
    });
  });

  it('infers status from progress text with "failed" keyword', async () => {
    fetch
      .mockResolvedValueOnce(
        makeJsonResponse({ job_id: 'J-PROGRESS-FAIL' }, { ok: true, status: 202 })
      )
      .mockResolvedValueOnce(
        makeJsonResponse({ 
          progress: 'Failed to provision resources',
          message: 'Process failed'
        })
      );

    renderWithRouter(<ProvisioningPage />);
    
    const orgIdInput = screen.getByLabelText(/Organization ID/i);
    fireEvent.change(orgIdInput, { target: { value: 'TEST_PROGRESS_FAIL' } });
    fireEvent.click(screen.getByRole('button', { name: /start provisioning/i }));

    await waitFor(() => 
      expect(screen.getByText(/Job ID:\s*J-PROGRESS-FAIL/i)).toBeInTheDocument()
    );

    jest.advanceTimersByTime(5000);
    
    await waitFor(() => {
      const failedElements = screen.queryAllByText(/Failed/i);
      expect(failedElements.length).toBeGreaterThan(0);
    });
  });

  it('infers status from progress text with "completed" keyword', async () => {
    fetch
      .mockResolvedValueOnce(
        makeJsonResponse({ job_id: 'J-PROGRESS-DONE' }, { ok: true, status: 202 })
      )
      .mockResolvedValueOnce(
        makeJsonResponse({ 
          progress: 'Provisioning completed successfully'
        })
      );

    renderWithRouter(<ProvisioningPage />);
    
    const orgIdInput = screen.getByLabelText(/Organization ID/i);
    fireEvent.change(orgIdInput, { target: { value: 'TEST_PROGRESS_DONE' } });
    fireEvent.click(screen.getByRole('button', { name: /start provisioning/i }));

    await waitFor(() => 
      expect(screen.getByText(/Job ID:\s*J-PROGRESS-DONE/i)).toBeInTheDocument()
    );

    jest.advanceTimersByTime(5000);
    
    await waitFor(() => {
      const succeededElements = screen.queryAllByText(/succeeded/i);
      expect(succeededElements.length).toBeGreaterThan(0);
    });
  });

  it('uses progress as message when message is not provided', async () => {
    fetch
      .mockResolvedValueOnce(
        makeJsonResponse({ job_id: 'J-NO-MSG' }, { ok: true, status: 202 })
      )
      .mockResolvedValueOnce(
        makeJsonResponse({ 
          status: 'running',
          progress: 'Installing dependencies...'
        })
      );

    renderWithRouter(<ProvisioningPage />);
    
    const orgIdInput = screen.getByLabelText(/Organization ID/i);
    fireEvent.change(orgIdInput, { target: { value: 'TEST_NO_MSG' } });
    fireEvent.click(screen.getByRole('button', { name: /start provisioning/i }));

    await waitFor(() => 
      expect(screen.getByText(/Job ID:\s*J-NO-MSG/i)).toBeInTheDocument()
    );

    jest.advanceTimersByTime(5000);
    
    await waitFor(() => {
      const messages = screen.getAllByText(/Installing dependencies\.\.\./i);
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  it('infers status as "running" for progress text without keywords', async () => {
    fetch
      .mockResolvedValueOnce(
        makeJsonResponse({ job_id: 'J-RUNNING' }, { ok: true, status: 202 })
      )
      .mockResolvedValueOnce(
        makeJsonResponse({ 
          status: '', // Empty status
          message: '',
          progress: 'Installing packages on workstations' // No "failed" or "completed" keywords
        })
      );

    renderWithRouter(<ProvisioningPage />);
    
    const orgIdInput = screen.getByLabelText(/Organization ID/i);
    fireEvent.change(orgIdInput, { target: { value: 'TEST_RUNNING' } });
    fireEvent.click(screen.getByRole('button', { name: /start provisioning/i }));

    await waitFor(() => 
      expect(screen.getByText(/Job ID:\s*J-RUNNING/i)).toBeInTheDocument()
    );

    jest.advanceTimersByTime(5000);
    
    // Should infer status as "running" (line 69) and show the progress text
    await waitFor(() => {
      const progressTexts = screen.getAllByText(/Installing packages on workstations/i);
      expect(progressTexts.length).toBeGreaterThan(0);
    });
  });

  it('displays workstation metadata with N/A for missing public IP', async () => {
    const resultWithMetadata = {
      org_id: 'TEST_ORG',
      region: 'us-east-1',
      work_dir: '/tmp/test',
      message: 'Provisioning complete',
      metadata: [
        {
          name: 'workstation-1',
          os: 'Windows',
          instance_id: 'i-12345',
          public_ip: null, // Missing public IP
          private_ip: '10.0.1.5',
          status: 'running'
        },
        {
          name: 'workstation-2',
          os: 'Linux',
          instance_id: 'i-67890',
          public_ip: '54.123.45.67',
          private_ip: '10.0.1.6',
          status: 'running'
        }
      ]
    };

    fetch
      .mockResolvedValueOnce(
        makeJsonResponse({ job_id: 'J-METADATA' }, { ok: true, status: 202 })
      )
      .mockResolvedValueOnce(
        makeJsonResponse({ 
          status: 'succeeded',
          message: 'done',
          progress: 100,
          result: resultWithMetadata
        })
      );

    renderWithRouter(<ProvisioningPage />);
    
    const orgIdInput = screen.getByLabelText(/Organization ID/i);
    fireEvent.change(orgIdInput, { target: { value: 'TEST_METADATA' } });
    fireEvent.click(screen.getByRole('button', { name: /start provisioning/i }));

    await waitFor(() => 
      expect(screen.getByText(/Job ID:\s*J-METADATA/i)).toBeInTheDocument()
    );

    jest.advanceTimersByTime(5000);
    
    await waitFor(() => {
      const completeTexts = screen.getAllByText(/Provisioning Complete/i);
      expect(completeTexts.length).toBeGreaterThan(0);
    });
    
    // Check workstation names are displayed
    expect(screen.getByText('workstation-1')).toBeInTheDocument();
    expect(screen.getByText('workstation-2')).toBeInTheDocument();
    
    // Check for N/A when public IP is missing and actual IP when present
    const publicIpElements = screen.getAllByText(/Public IP:/);
    expect(publicIpElements.length).toBeGreaterThanOrEqual(2);
    
    // Verify N/A is present for missing public IP
    expect(screen.getByText(/N\/A/)).toBeInTheDocument();
  });
});
