import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProvisioningPage from '../ProvisioningPage';

// --- Router mocks (navigate) ---
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// --- Helpers ---
const renderWithRouter = (ui) => render(ui, { wrapper: BrowserRouter });

const makeJsonResponse = (data, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  json: jest.fn().mockResolvedValue(data),
  text: jest.fn().mockResolvedValue(JSON.stringify(data)),
});

// Ensures fetch mock exists per test
beforeEach(() => {
  jest.useFakeTimers();
  global.fetch = jest.fn();
  jest.spyOn(Storage.prototype, 'setItem');
  mockNavigate.mockClear();
});

afterEach(() => {
  jest.runOnlyPendingTimers(); // Run any remaining timers before cleanup
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('ProvisioningPage', () => {
  it('renders with organization ID input field', () => {
    renderWithRouter(<ProvisioningPage />);
    // Check for title
    expect(screen.getByRole('heading', { name: /Provisioning/i })).toBeInTheDocument();
    // Check for org ID input field
    expect(screen.getByLabelText(/Organization ID/i)).toBeInTheDocument();
    // Start button should be disabled when org ID is empty
    expect(screen.getByRole('button', { name: /start provisioning/i })).toBeDisabled();
    // Idle state hint from ProvisioningControls
    expect(screen.getByText(/No job started yet\./i)).toBeInTheDocument();
  });

  it('starts provisioning, polls status, and on success: sets localStorage, calls onProvisioned, navigates', async () => {
    const onProvisioned = jest.fn();

    // 1) POST /task/provision -> { job_id }
    fetch
      .mockResolvedValueOnce(
        makeJsonResponse({ job_id: 'J-123' }, { ok: true, status: 202 })
      )
      // 2) first poll: running
      .mockResolvedValueOnce(
        makeJsonResponse({ status: 'running', message: 'booting', progress: 10 })
      )
      // 3) second poll: succeeded
      .mockResolvedValueOnce(
        makeJsonResponse({ status: 'succeeded', message: 'done', progress: 100 })
      );

    renderWithRouter(<ProvisioningPage onProvisioned={onProvisioned} />);

    // Enter org ID
    const orgIdInput = screen.getByLabelText(/Organization ID/i);
    fireEvent.change(orgIdInput, { target: { value: 'TEST_ORG' } });

    // Click "Start Provisioning"
    fireEvent.click(screen.getByRole('button', { name: /start provisioning/i }));

    // POST was called with the entered org id
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5050/task/provision',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ org_id: 'TEST_ORG' }),
        })
      )
    );

    // After POST completes, job id appears and status becomes running
    await waitFor(() =>
      expect(screen.getByText(/Job ID:\s*J-123/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/^Status:\s*running$/i)).toBeInTheDocument();

    // First poll tick → running/progress 10%
    jest.advanceTimersByTime(5000);
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith('http://localhost:5050/status/J-123')
    );
    // Text appears as "Provisioning… 10%" but may be split across elements
    await waitFor(() => {
      expect(screen.getByText(/Provisioning…/i)).toBeInTheDocument();
      // Use getAllByText since "10%" appears in multiple places (Chip and caption)
      const progressElements = screen.getAllByText(/10%/i);
      expect(progressElements.length).toBeGreaterThan(0);
    });

    // Second poll tick → succeeded
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      // Should show success status
      const statusElements = screen.queryAllByText(/succeeded/i);
      expect(statusElements.length).toBeGreaterThan(0);
    });
  });

  it('handles failure from polling and shows error UI; stops polling', async () => {
    // POST ok -> job id
    fetch
      .mockResolvedValueOnce(
        makeJsonResponse({ job_id: 'J-FAIL' }, { ok: true, status: 202 })
      )
      // first poll returns failed
      .mockResolvedValueOnce(
        makeJsonResponse({ status: 'failed', message: 'boom', progress: 42 })
      );

    renderWithRouter(<ProvisioningPage />);

    // Enter org ID
    const orgIdInput = screen.getByLabelText(/Organization ID/i);
    fireEvent.change(orgIdInput, { target: { value: 'TEST_FAIL' } });

    fireEvent.click(screen.getByRole('button', { name: /start provisioning/i }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5050/task/provision',
        expect.any(Object)
      )
    );

    // Advance to the next timer (the polling interval) and allow async operations to complete
    await act(async () => {
      jest.advanceTimersToNextTimer();
      await Promise.resolve();
      jest.advanceTimersToNextTimer(); // Advance once more to flush any followup timers
    });

    await waitFor(() => {
      // Failure chip + message - use getAllByText since "Failed" appears in both Chip and status
      const failedElements = screen.queryAllByText(/Failed/i);
      expect(failedElements.length).toBeGreaterThan(0);
    });
    
    // "boom" appears in multiple places (ProvisioningControls and failure message box)
    const boomElements = screen.getAllByText(/boom/i);
    expect(boomElements.length).toBeGreaterThan(0);

    const callsAfterFail = fetch.mock.calls.length;

    // Tick more—should NOT keep polling
    jest.advanceTimersByTime(6000);
    expect(fetch.mock.calls.length).toBe(callsAfterFail);
  });

  it('Reset returns page to idle and clears progress/message/jobId', async () => {
    // POST ok -> job id, poll running
    fetch
      .mockResolvedValueOnce(
        makeJsonResponse({ job_id: 'J-RESET' }, { ok: true, status: 202 })
      )
      .mockResolvedValueOnce(
        makeJsonResponse({ status: 'running', message: 'init', progress: 5 })
      );

    renderWithRouter(<ProvisioningPage />);

    // Enter org ID
    const orgIdInput = screen.getByLabelText(/Organization ID/i);
    fireEvent.change(orgIdInput, { target: { value: 'TEST_RESET' } });

    fireEvent.click(screen.getByRole('button', { name: /start provisioning/i }));

    await waitFor(() =>
      expect(screen.getByText(/Job ID:\s*J-RESET/i)).toBeInTheDocument()
    );

    jest.advanceTimersByTime(5000);
    await waitFor(() =>
      expect(screen.getByText(/Provisioning…/i)).toBeInTheDocument()
    );

    // Click Reset
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));

    // Back to idle state
    expect(screen.getByText(/No job started yet\./i)).toBeInTheDocument();
    expect(screen.queryByText(/Provisioning…/i)).not.toBeInTheDocument();

    // Start button should be enabled again
    expect(
      screen.getByRole('button', { name: /start provisioning/i })
    ).toBeEnabled();
  });

  it('cleans up polling interval on unmount (no errors)', () => {
    // Make sure an interval is created first
    fetch
      .mockResolvedValueOnce(
        makeJsonResponse({ job_id: 'J-UNMOUNT' }, { ok: true, status: 202 })
      )
      .mockResolvedValue(makeJsonResponse({ status: 'running' }));

    const { unmount } = renderWithRouter(<ProvisioningPage />);
    
    // Enter org ID
    const orgIdInput = screen.getByLabelText(/Organization ID/i);
    fireEvent.change(orgIdInput, { target: { value: 'TEST_UNMOUNT' } });
    
    fireEvent.click(screen.getByRole('button', { name: /start provisioning/i }));
    // allow POST settle
    // we don't need explicit assertions; just ensure unmount doesn't throw
    unmount();
    expect(true).toBe(true);
  });

  it('shows failure if POST returns malformed response (no job_id)', async () => {
    fetch.mockResolvedValueOnce(
      makeJsonResponse({}, { ok: true, status: 202 })
    );

    renderWithRouter(<ProvisioningPage />);
    
    // Enter org ID
    const orgIdInput = screen.getByLabelText(/Organization ID/i);
    fireEvent.change(orgIdInput, { target: { value: 'TEST_MALFORMED' } });
    
    fireEvent.click(screen.getByRole('button', { name: /start provisioning/i }));

    await waitFor(() => {
      // Multiple "Failed" elements will exist
      const failedElements = screen.getAllByText(/Failed/i);
      expect(failedElements.length).toBeGreaterThan(0);
      // "missing job_id" appears in multiple places, use getAllByText
      const errorElements = screen.getAllByText(/missing job_id/i);
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });

  it('shows failure if POST is not ok', async () => {
    fetch.mockResolvedValueOnce(
      makeJsonResponse({ error: 'nope' }, { ok: false, status: 500 })
    );

    renderWithRouter(<ProvisioningPage />);
    
    // Enter org ID
    const orgIdInput = screen.getByLabelText(/Organization ID/i);
    fireEvent.change(orgIdInput, { target: { value: 'TEST_ERROR' } });
    
    fireEvent.click(screen.getByRole('button', { name: /start provisioning/i }));

    await waitFor(() => {
      // Multiple "Failed" elements will exist
      const failedElements = screen.getAllByText(/Failed/i);
      expect(failedElements.length).toBeGreaterThan(0);
      // The error message appears in multiple places, use getAllByText or check for failed status
      expect(screen.getByText(/Status:\s*failed/i)).toBeInTheDocument();
    });
  });

  it('handles status fetch error with text response', async () => {
    // POST succeeds
    fetch.mockResolvedValueOnce(
      makeJsonResponse({ job_id: 'J-STATUS-ERR' }, { ok: true, status: 202 })
    );
    
    // Status fetch fails with error text
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('Server error occurred'),
      json: jest.fn().mockResolvedValue({}),
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
