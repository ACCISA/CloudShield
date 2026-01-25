import { renderHook, act } from '@testing-library/react';
import { useClickLogger } from '../useClickLogger.js';

const mockTrackButton = jest.fn();

jest.mock('../../lib/analytics', () => ({
  trackButton: (...args) => mockTrackButton(...args),
}));

describe('useClickLogger', () => {
  beforeEach(() => {
    mockTrackButton.mockClear();
  });

  it('forwards name and meta fields', () => {
    const { result } = renderHook(() => useClickLogger({ page: 'users' }));
    const handler = result.current({ name: 'click', control: 'refresh_button' })(jest.fn());

    act(() => handler({ type: 'click' }));

    expect(mockTrackButton).toHaveBeenCalledWith('click', {
      page: 'users',
      control: 'refresh_button',
    });
  });

  it('calls user handler after logging', () => {
    const userHandler = jest.fn();
    const { result } = renderHook(() => useClickLogger());
    const handler = result.current({ name: 'save' })(userHandler);

    act(() => handler({ type: 'click' }));

    expect(mockTrackButton).toHaveBeenCalledTimes(1);
    expect(userHandler).toHaveBeenCalledTimes(1);
  });
});
