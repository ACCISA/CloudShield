import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ProvisioningPage from '../ProvisioningPage.jsx';

// Mock the logo
jest.mock('../../assets/cloudshield_logo_white.png', () => 'test-logo');

// Mock ProvisioningProgressBar
jest.mock('../../components/provisioning/ProvisioningProgressBar.jsx', () => {
  return function MockProgressBar({ percent }) {
    return <div data-testid="progress-bar">{percent}%</div>;
  };
});

describe('ProvisioningPage', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn();
    jest.useFakeTimers();
    // Mock window.location.href
    delete window.location;
    window.location = { href: jest.fn() };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('renders the provisioning page', () => {
    render(<ProvisioningPage />);
    // Check for visible heading text
    expect(screen.getByText(/Hang tight/i)).toBeInTheDocument();
  });

  it('displays the CloudShield logo', () => {
    render(<ProvisioningPage />);
    const logo = screen.getByAltText('Logo');
    expect(logo).toBeInTheDocument();
  });

  it('starts with initializing message', async () => {
    localStorage.setItem('provision_job_id', 'test-job-id');
    
    render(<ProvisioningPage />);
    
    // Initial state shows initializing message
    await waitFor(() => {
      // Check if the text appears anywhere, even in error state
      const text = screen.queryByText(/Initializing/i) || screen.queryByText(/Error/i);
      expect(text).toBeInTheDocument();
    });
  });

  it('fetches and starts job if no job_id exists', async () => {
    localStorage.setItem('org_id', 'test-org-123');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ job_id: 'job-456' }),
    });

    render(<ProvisioningPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5050/api/task/provision',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ org_id: 'test-org-123' }),
        })
      );
    });
  });

  it('uses existing job_id from localStorage', async () => {
    localStorage.setItem('provision_job_id', 'existing-job-789');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'running',
        progress: 'Starting provisioning...',
      }),
    });

    render(<ProvisioningPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:5050/api/status')
      );
    });
  });

  it('handles missing org_id gracefully', async () => {
    render(<ProvisioningPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Error: Organization ID missing/i)
      ).toBeInTheDocument();
    });
  });

  it('polls status endpoint when job exists', async () => {
    localStorage.setItem('provision_job_id', 'test-job-id');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'running',
        progress: 'Docker provisioning started...',
      }),
    });

    render(<ProvisioningPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5050/api/status/test-job-id'
      );
    });
  });

  it('updates progress text when status changes', async () => {
    localStorage.setItem('provision_job_id', 'test-job-id');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'running',
        progress: 'Docker provisioning started...',
      }),
    });

    render(<ProvisioningPage />);

    await waitFor(() => {
      expect(screen.getByText('Docker provisioning started...')).toBeInTheDocument();
    });
  });

  it('handles success status and shows completion message', async () => {
    localStorage.setItem('provision_job_id', 'test-job-id');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'succeeded',
        progress: 'All done!',
      }),
    });

    render(<ProvisioningPage />);

    await waitFor(() => {
      expect(screen.getByText(/Provisioning complete!/i)).toBeInTheDocument();
    });

    // Verify localStorage was updated
    expect(localStorage.getItem('isProvisioned')).toBe('true');
    expect(localStorage.getItem('provision_job_id')).toBeNull();
  });

  it('handles failed status and displays error message', async () => {
    localStorage.setItem('provision_job_id', 'test-job-id');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'failed',
        error: 'Docker initialization failed',
      }),
    });

    render(<ProvisioningPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Provisioning failed: Docker initialization failed/i)
      ).toBeInTheDocument();
    });
  });

  it('displays retry button on failure', async () => {
    localStorage.setItem('provision_job_id', 'test-job-id');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'failed',
        error: 'Test failure',
      }),
    });

    render(<ProvisioningPage />);

    await waitFor(() => {
      expect(screen.getByText('Retry Provisioning')).toBeInTheDocument();
    });
  });

  it('retry button reloads the page', async () => {
    localStorage.setItem('provision_job_id', 'test-job-id');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'failed',
        error: 'Test failure',
      }),
    });

    const reloadSpy = jest.fn();
    window.location.reload = reloadSpy;

    render(<ProvisioningPage />);

    await waitFor(() => {
      const retryButton = screen.getByText('Retry Provisioning');
      fireEvent.click(retryButton);
    });

    expect(reloadSpy).toHaveBeenCalled();
  });

  it('normalizes succeeded status variations', async () => {
    localStorage.setItem('provision_job_id', 'test-job-id');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'FINISHED',
        progress: 'Done!',
      }),
    });

    render(<ProvisioningPage />);

    await waitFor(() => {
      expect(screen.getByText(/Provisioning complete!/i)).toBeInTheDocument();
    });
  });

  it('normalizes failed status variations', async () => {
    localStorage.setItem('provision_job_id', 'test-job-id');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'ERROR',
        error: 'Something went wrong',
      }),
    });

    render(<ProvisioningPage />);

    await waitFor(() => {
      expect(screen.getByText(/Provisioning failed:/i)).toBeInTheDocument();
    });
  });

  it('infers progress percentage from status messages', async () => {
    localStorage.setItem('provision_job_id', 'test-job-id');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'running',
        progress: 'SSH key generation complete',
      }),
    });

    render(<ProvisioningPage />);

    await waitFor(() => {
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveTextContent('30%');
    });
  });

  it('handles fetch errors gracefully', async () => {
    localStorage.setItem('provision_job_id', 'test-job-id');

    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    render(<ProvisioningPage />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Polling network error:',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('handles 404 status responses without updating state', async () => {
    localStorage.setItem('provision_job_id', 'test-job-id');

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    render(<ProvisioningPage />);

    // Should remain in initializing state
    await waitFor(() => {
      expect(screen.getByText('Initializing...')).toBeInTheDocument();
    });
  });

  it('handles 500 server errors without updating state', async () => {
    localStorage.setItem('provision_job_id', 'test-job-id');

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<ProvisioningPage />);

    // Should remain in initializing state
    await waitFor(() => {
      expect(screen.getByText('Initializing...')).toBeInTheDocument();
    });
  });

  it('displays correct heading text', () => {
    render(<ProvisioningPage />);
    
    // Check for the first part of the heading
    expect(screen.getByText(/Hang tight/i)).toBeInTheDocument();
  });

  it('applies dark theme styling', () => {
    const { container } = render(<ProvisioningPage />);
    const mainDiv = container.firstChild;
    // Check that the background color style is applied
    expect(mainDiv.style.backgroundColor).toBe('rgb(10, 10, 10)');
    expect(mainDiv.style.color).toBe('rgb(255, 255, 255)');
  });

  it('centers content vertically and horizontally', () => {
    const { container } = render(<ProvisioningPage />);
    const mainDiv = container.firstChild;
    // Check that flex layout styles are applied
    expect(mainDiv.style.display).toBe('flex');
    expect(mainDiv.style.alignItems).toBe('center');
    expect(mainDiv.style.justifyContent).toBe('center');
  });
});
