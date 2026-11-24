import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import { TEMPLATE_COPY_URL, TEMPLATE_URL } from '../../config/template';
import { SheetSetupDialog } from './SheetSetupDialog';

describe('template links', () => {
  it('point at the same Google Sheet', () => {
    const id = /\/d\/([^/]+)\//.exec(TEMPLATE_URL)?.[1];

    expect(id).toBeTruthy();
    expect(TEMPLATE_COPY_URL).toBe(`https://docs.google.com/spreadsheets/d/${id}/copy`);
  });
});

describe('SheetSetupDialog', () => {
  it('shows nothing while closed', () => {
    render(<SheetSetupDialog open={false} onOpenChange={vi.fn()} />);

    expect(screen.queryByText('Set up your trip sheet')).not.toBeInTheDocument();
  });

  it('links to the template, both to copy it and to preview it', () => {
    render(<SheetSetupDialog open onOpenChange={vi.fn()} />);

    expect(screen.getByRole('link', { name: /Make a copy/ })).toHaveAttribute(
      'href',
      TEMPLATE_COPY_URL,
    );
    expect(screen.getByRole('link', { name: /Preview the template/ })).toHaveAttribute(
      'href',
      TEMPLATE_URL,
    );
  });

  it('opens the links in a new tab without leaking the opener', () => {
    render(<SheetSetupDialog open onOpenChange={vi.fn()} />);

    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')).toContain('noreferrer');
    }
  });

  it('explains every step and the columns that are read', () => {
    render(<SheetSetupDialog open onOpenChange={vi.fn()} />);

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(5);
    expect(screen.getByText('Morning location (address)')).toBeInTheDocument();
    expect(screen.getByText('Anyone with the link')).toBeInTheDocument();
  });

  it('asks to close when "Got it" is pressed', async () => {
    const onOpenChange = vi.fn();
    render(<SheetSetupDialog open onOpenChange={onOpenChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Got it' }));

    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });
});
