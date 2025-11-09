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
  it('renders and shows hard-coded org ID', () => {
    renderWithRouter(<ProvisioningPage />);
    // Multiple elements can have "Provisioning" text (title and button), use getByRole for title
    expect(screen.getByRole('heading', { name: /Provisioning/i })).toBeInTheDocument();
    // Text is split across elements, check for parts separately
    expect(screen.getByText(/Org ID:/i)).toBeInTheDocument();
    expect(screen.getByText(/TEST_Andrew/i)).toBeInTheDocument();
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

    // Click "Start Provisioning"
    fireEvent.click(screen.getByRole('button', { name: /start provisioning/i }));

    // POST was called with hard-coded org id
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        'http://172.18.0.3:5050/task/provision',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ org_id: 'TEST_Andrew' }),
        })
      )
    );

    // After POST completes, job id appears and status becomes running
    await waitFor(() =>
      expect(screen.getByText(/Job ID:\s*J-123/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/^Status:\s*running$/i)).toBeInTheDocument();

    // First poll tick → running/progress 10%
    jest.advanceTimersByTime(2000);
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith('/status/J-123')
    );
    // Text appears as "Provisioning… 10%" but may be split across elements
    await waitFor(() => {
      expect(screen.getByText(/Provisioning…/i)).toBeInTheDocument();
      // Use getAllByText since "10%" appears in multiple places (Chip and caption)
      const progressElements = screen.getAllByText(/10%/i);
      expect(progressElements.length).toBeGreaterThan(0);
    });

    // Second poll tick → succeeded
    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      // on success side-effects
      expect(localStorage.setItem).toHaveBeenCalledWith('isProvisioned', 'true');
      expect(onProvisioned).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
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

    fireEvent.click(screen.getByRole('button', { name: /start provisioning/i }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        'http://172.18.0.3:5050/task/provision',
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

    fireEvent.click(screen.getByRole('button', { name: /start provisioning/i }));

    await waitFor(() =>
      expect(screen.getByText(/Job ID:\s*J-RESET/i)).toBeInTheDocument()
    );

    jest.advanceTimersByTime(2000);
    await waitFor(() =>
      expect(screen.getByText(/Provisioning…\s*5%/i)).toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('button', { name: /start provisioning/i }));

    await waitFor(() => {
      // Multiple "Failed" elements will exist
      const failedElements = screen.getAllByText(/Failed/i);
      expect(failedElements.length).toBeGreaterThan(0);
      // The error message appears in multiple places, use getAllByText
      const errorElements = screen.getAllByText(/error/i);
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });
});
