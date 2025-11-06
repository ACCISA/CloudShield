import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import OtpCodeInput from '../OtpCodeInput';

describe('OtpCodeInput', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders correct number of input boxes', () => {
    const values = ['', '', '', '', '', ''];
    render(<OtpCodeInput values={values} onChange={mockOnChange} />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(6);
  });

  it('displays initial values correctly', () => {
    const values = ['1', '2', '3', '', '', ''];
    render(<OtpCodeInput values={values} onChange={mockOnChange} />);
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
  });

  it('calls onChange with correct index and value', () => {
    const values = ['', '', '', ''];
    render(<OtpCodeInput values={values} onChange={mockOnChange} />);
    const inputs = screen.getAllByRole('textbox');
    
    fireEvent.change(inputs[0], { target: { value: '5' } });
    expect(mockOnChange).toHaveBeenCalledWith(0, '5');
  });

  it('accepts only single character per input', () => {
    const values = ['', '', '', ''];
    render(<OtpCodeInput values={values} onChange={mockOnChange} />);
    const inputs = screen.getAllByRole('textbox');
    
    fireEvent.change(inputs[0], { target: { value: '123' } });
    // Should only take the last character
    expect(mockOnChange).toHaveBeenCalledWith(0, '3');
  });

  it('handles empty values array', () => {
    render(<OtpCodeInput values={[]} onChange={mockOnChange} />);
    const inputs = screen.queryAllByRole('textbox');
    expect(inputs).toHaveLength(0);
  });

  it('renders with default empty array when values not provided', () => {
    render(<OtpCodeInput onChange={mockOnChange} />);
    const inputs = screen.queryAllByRole('textbox');
    expect(inputs).toHaveLength(0);
  });

  it('applies maxLength of 1 to each input', () => {
    const values = ['', '', ''];
    render(<OtpCodeInput values={values} onChange={mockOnChange} />);
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach(input => {
      expect(input).toHaveAttribute('maxLength', '1');
    });
  });
});
