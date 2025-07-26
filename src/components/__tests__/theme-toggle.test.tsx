
import { render, screen } from '@testing-library/react';
import { ThemeToggle } from '../theme-toggle';

describe('ThemeToggle', () => {
  it('renders a button', () => {
    render(<ThemeToggle />);

    const button = screen.getByRole('button');

    expect(button).toBeInTheDocument();
  });
});
