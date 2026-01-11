import { fireEvent, render, screen } from '@testing-library/react';
import { ActionButton, buttonStyles, formStyles } from './workstationDialogStyles.jsx';

describe('workstationDialogStyles exports', () => {
  test('exposes shared style objects', () => {
    expect(buttonStyles.button.textTransform).toBe('none');
    expect(buttonStyles.deleteButton.backgroundColor).toBe('#7c1d1d');
    expect(formStyles.formGrid.display).toBe('grid');
    expect(formStyles.checkbox.width).toBe('18px');
  });
});

describe('ActionButton', () => {
  test('renders with default base styles and handles click without custom styles', () => {
    const onClick = jest.fn();
    render(<ActionButton onClick={onClick}>Default Action</ActionButton>);

    const button = screen.getByRole('button', { name: 'Default Action' });

    expect(button).toHaveStyle('text-transform: none');
    expect(button).toHaveStyle('border-radius: 12px');

    fireEvent.click(button);
    fireEvent.mouseEnter(button);
    fireEvent.mouseLeave(button);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(button).toHaveStyle('text-transform: none');
  });

  test('applies hover style then reverts to provided style on mouse leave', () => {
    const style = { backgroundColor: 'white', color: 'green' };
    const hoverStyle = { backgroundColor: 'black', color: 'yellow' };

    render(
      <ActionButton style={style} hoverStyle={hoverStyle}>
        Hover Action
      </ActionButton>
    );

    const button = screen.getByRole('button', { name: 'Hover Action' });

    expect(button).toHaveStyle('background-color: white');
    expect(button).toHaveStyle('color: green');

    fireEvent.mouseEnter(button);
    expect(button).toHaveStyle('background-color: black');
    expect(button).toHaveStyle('color: yellow');

    fireEvent.mouseLeave(button);
    expect(button).toHaveStyle('background-color: white');
    expect(button).toHaveStyle('color: green');
  });

  test('merges custom baseStyle with inline style', () => {
    const baseStyle = { padding: '0px', textTransform: 'uppercase', borderRadius: '4px' };
    const style = { color: 'blue' };

    render(
      <ActionButton baseStyle={baseStyle} style={style}>
        Custom Base
      </ActionButton>
    );

    const button = screen.getByRole('button', { name: 'Custom Base' });

    expect(button).toHaveStyle('text-transform: uppercase');
    expect(button).toHaveStyle('border-radius: 4px');
    expect(button).toHaveStyle('color: blue');
  });
});
