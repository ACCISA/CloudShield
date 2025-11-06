import { createTheme } from '@mui/material/styles';
import theme from '../theme';

describe('Theme Configuration', () => {
  it('exports a valid MUI theme object', () => {
    expect(theme).toBeDefined();
    expect(typeof theme).toBe('object');
  });

  it('has dark mode palette', () => {
    expect(theme.palette.mode).toBe('dark');
  });

  it('has correct background colors', () => {
    expect(theme.palette.background.default).toBe('#0A0A0A');
    expect(theme.palette.background.paper).toBe('#111111');
  });

  it('has correct text colors', () => {
    expect(theme.palette.text.primary).toBe('#FFFFFF');
    expect(theme.palette.text.secondary).toBe('#9E9E9E');
  });

  it('has correct divider color', () => {
    expect(theme.palette.divider).toBe('rgba(255,255,255,0.12)');
  });

  it('has correct primary color', () => {
    expect(theme.palette.primary.main).toBe('#000000');
  });

  it('has correct border radius', () => {
    expect(theme.shape.borderRadius).toBe(12);
  });

  it('has correct font family', () => {
    expect(theme.typography.fontFamily).toContain('Inter');
    expect(theme.typography.fontFamily).toContain('system-ui');
  });

  it('has correct body1 typography', () => {
    expect(theme.typography.body1.fontSize).toBe('0.95rem');
    expect(theme.typography.body1.lineHeight).toBe(1.4);
  });

  it('has MuiPaper component overrides', () => {
    expect(theme.components.MuiPaper).toBeDefined();
    expect(theme.components.MuiPaper.styleOverrides).toBeDefined();
  });

  it('has correct MuiPaper rounded styles', () => {
    const paperStyles = theme.components.MuiPaper.styleOverrides.rounded;
    expect(paperStyles.borderRadius).toBe('20px');
    expect(paperStyles.backgroundColor).toBe('#111111');
    expect(paperStyles.border).toBe('1px solid rgba(255,255,255,0.08)');
  });

  it('has MuiTextField component overrides', () => {
    expect(theme.components.MuiTextField).toBeDefined();
    expect(theme.components.MuiTextField.styleOverrides).toBeDefined();
  });

  it('has correct MuiTextField root styles', () => {
    const textFieldStyles = theme.components.MuiTextField.styleOverrides.root;
    expect(textFieldStyles.backgroundColor).toBe('#161616');
    expect(textFieldStyles.borderRadius).toBe('8px');
    expect(textFieldStyles.border).toBe('1px solid rgba(255,255,255,0.18)');
  });

  it('has MuiOutlinedInput component overrides', () => {
    expect(theme.components.MuiOutlinedInput).toBeDefined();
    expect(theme.components.MuiOutlinedInput.styleOverrides).toBeDefined();
  });

  it('has correct MuiOutlinedInput root styles', () => {
    const outlinedInputStyles = theme.components.MuiOutlinedInput.styleOverrides.root;
    expect(outlinedInputStyles.backgroundColor).toBe('#161616');
    expect(outlinedInputStyles.borderRadius).toBe('8px');
    expect(outlinedInputStyles.color).toBe('#fff');
  });

  it('has correct MuiOutlinedInput notchedOutline styles', () => {
    const notchedOutlineStyles = theme.components.MuiOutlinedInput.styleOverrides.notchedOutline;
    expect(notchedOutlineStyles.borderColor).toBe('rgba(255,255,255,0.18)');
  });

  it('has correct MuiOutlinedInput input styles', () => {
    const inputStyles = theme.components.MuiOutlinedInput.styleOverrides.input;
    expect(inputStyles.fontSize).toBe('0.95rem');
    expect(inputStyles.paddingTop).toBe('12px');
    expect(inputStyles.paddingBottom).toBe('12px');
  });

  it('has MuiInputLabel component overrides', () => {
    expect(theme.components.MuiInputLabel).toBeDefined();
    expect(theme.components.MuiInputLabel.styleOverrides).toBeDefined();
  });

  it('has correct MuiInputLabel root styles', () => {
    const inputLabelStyles = theme.components.MuiInputLabel.styleOverrides.root;
    expect(inputLabelStyles.color).toBe('#fff');
    expect(inputLabelStyles.fontSize).toBe('0.9rem');
    expect(inputLabelStyles.lineHeight).toBe(1.2);
    expect(inputLabelStyles.marginBottom).toBe('6px');
  });

  it('has MuiButton component overrides', () => {
    expect(theme.components.MuiButton).toBeDefined();
    expect(theme.components.MuiButton.styleOverrides).toBeDefined();
  });

  it('has correct MuiButton root styles', () => {
    const buttonStyles = theme.components.MuiButton.styleOverrides.root;
    expect(buttonStyles.textTransform).toBe('none');
    expect(buttonStyles.fontSize).toBe('1rem');
    expect(buttonStyles.fontWeight).toBe(500);
    expect(buttonStyles.borderRadius).toBe('14px');
    expect(buttonStyles.lineHeight).toBe(1.3);
    expect(buttonStyles.paddingTop).toBe('14px');
    expect(buttonStyles.paddingBottom).toBe('14px');
  });

  it('can be used to create a theme', () => {
    expect(() => createTheme(theme)).not.toThrow();
  });

  it('has all required component overrides', () => {
    const expectedComponents = [
      'MuiPaper',
      'MuiTextField',
      'MuiOutlinedInput',
      'MuiInputLabel',
      'MuiButton',
    ];

    expectedComponents.forEach(component => {
      expect(theme.components[component]).toBeDefined();
    });
  });

  it('maintains consistent dark theme colors', () => {
    // Verify all background colors are dark
    expect(theme.palette.background.default.startsWith('#0')).toBe(true);
    expect(theme.palette.background.paper.startsWith('#1')).toBe(true);
    
    // Verify text primary is white
    expect(theme.palette.text.primary).toBe('#FFFFFF');
  });

  it('has consistent border styling', () => {
    const borderColor = 'rgba(255,255,255,0.18)';
    
    expect(theme.components.MuiTextField.styleOverrides.root.border).toContain('rgba(255,255,255,');
    expect(theme.components.MuiOutlinedInput.styleOverrides.notchedOutline.borderColor).toBe(borderColor);
  });

  it('has consistent component background color', () => {
    const componentBg = '#161616';
    
    expect(theme.components.MuiTextField.styleOverrides.root.backgroundColor).toBe(componentBg);
    expect(theme.components.MuiOutlinedInput.styleOverrides.root.backgroundColor).toBe(componentBg);
  });
});
