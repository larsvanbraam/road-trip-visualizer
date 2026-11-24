import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import { TooltipProvider } from '@/components/ui/tooltip';
import { RoadTrip } from '../../types/roadTrip.types';
import Sidebar from './Sidebar';

const stop = (dayNumber: string, from: string, to: string): RoadTrip[number] => ({
  dayNumber,
  date: '2026-07-01',
  morningLocation: from,
  afternoonLocation: '',
  eveningLocation: to,
  distance: '100 km',
  time: '1:00:00',
});

const data: RoadTrip = [stop('1', 'Amsterdam', 'Brussels'), stop('3', 'Brussels', 'Paris')];

function setup(props: Partial<React.ComponentProps<typeof Sidebar>> = {}) {
  const onDayClick = vi.fn();
  const onFullOverviewClick = vi.fn();

  render(
    <TooltipProvider>
      <Sidebar
        data={data}
        onDayClick={onDayClick}
        onFullOverviewClick={onFullOverviewClick}
        {...props}
      />
    </TooltipProvider>,
  );

  return { onDayClick, onFullOverviewClick };
}

describe('Sidebar', () => {
  it('lists every travel day with its locations', () => {
    setup();

    expect(screen.getByText('Day 1')).toBeInTheDocument();
    expect(screen.getByText('Day 3')).toBeInTheDocument();
    expect(screen.getAllByText('Brussels')).toHaveLength(2);
  });

  it('reports the clicked day', async () => {
    const { onDayClick } = setup();

    await userEvent.click(screen.getByRole('button', { name: /Day 3/ }));

    expect(onDayClick).toHaveBeenCalledWith('3');
  });

  it('marks the active day as pressed', () => {
    setup({ activeDay: '1' });

    expect(screen.getByRole('button', { name: /Day 1/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Day 3/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('opens the full overview', async () => {
    const { onFullOverviewClick } = setup();

    await userEvent.click(screen.getByRole('button', { name: /View full overview/ }));

    expect(onFullOverviewClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading placeholders while there is no data', () => {
    setup({ data: [] });

    expect(screen.queryByText(/Day \d/)).not.toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot=skeleton]')).toHaveLength(5);
  });
});
