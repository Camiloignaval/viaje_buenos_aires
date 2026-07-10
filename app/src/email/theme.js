// Tokens visuales de Aurora para email. Única fuente de verdad para
// colores/tipografía/espaciado — todos los componentes de src/email leen de acá,
// nunca redefinen un color o una tipografía por su cuenta.
export const theme = {
  colors: {
    primary: '#5a31f4',
    primaryDark: '#4423c7',
    primaryLight: '#eee9ff',
    background: '#fafafc',
    surface: '#ffffff',
    textPrimary: '#202124',
    textSecondary: '#6b7280',
    border: '#e5e4ef',
    white: '#ffffff',
  },
  font: {
    sans: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif',
  },
  radius: {
    sm: '10px',
    md: '16px',
    lg: '24px',
    pill: '999px',
  },
  spacing: {
    xs: '8px',
    sm: '16px',
    md: '24px',
    lg: '32px',
    xl: '48px',
  },
  maxWidth: '600px',
};

export const styles = {
  body: {
    margin: 0,
    padding: 0,
    backgroundColor: theme.colors.background,
    fontFamily: theme.font.sans,
  },
  container: {
    maxWidth: theme.maxWidth,
    margin: '0 auto',
    padding: `${theme.spacing.xl} ${theme.spacing.md}`,
  },
  heading: {
    margin: 0,
    color: theme.colors.textPrimary,
    fontSize: '24px',
    lineHeight: '32px',
    fontWeight: 600,
  },
  text: {
    margin: `${theme.spacing.sm} 0 0`,
    color: theme.colors.textPrimary,
    fontSize: '16px',
    lineHeight: '26px',
  },
  textMuted: {
    margin: `${theme.spacing.sm} 0 0`,
    color: theme.colors.textSecondary,
    fontSize: '14px',
    lineHeight: '22px',
  },
  hr: {
    border: 'none',
    borderTop: `1px solid ${theme.colors.border}`,
    margin: `${theme.spacing.lg} 0`,
  },
};
