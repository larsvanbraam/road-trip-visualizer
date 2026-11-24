import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, RefObject } from 'react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { RoadTrip } from '../../types/roadTrip.types';
import TripOverview, { TripOverviewHandles } from './TripOverview';

const day = (
  dayNumber: string,
  from: string,
  to: string,
  distance: string,
  time: string,
  via = '',
): RoadTrip[number] => ({
  dayNumber,
  date: `2026-07-0${dayNumber}`,
  morningLocation: from,
  afternoonLocation: via,
  eveningLocation: to,
  distance,
  time,
});

const data: RoadTrip = [
  day('1', 'Amsterdam', 'Cologne', '240 km', '2:35:00', 'Utrecht|Arnhem'),
  day('2', 'Cologne', 'Cologne', '0 km', '0:00:00'),
  day('3', 'Cologne', 'Munich', '575 km', '5:50:00'),
];

function setup(activeDay?: string) {
  const onDayClick = vi.fn();
  const handlesRef = createRef<TripOverviewHandles | undefined>() as RefObject<
    TripOverviewHandles | undefined
  >;

  render(
    <TripOverview
      data={data}
      activeDay={activeDay}
      onDayClick={onDayClick}
      handlesRef={handlesRef as React.MutableRefObject<TripOverviewHandles | undefined>}
    />,
  );

  const open = () => {
    act(() => handlesRef.current?.toggleDrawer());
  };

  return { onDayClick, open };
}

describe('TripOverview', () => {
  it('is closed until it is toggled', () => {
    setup();

    expect(screen.queryByText('Trip overview')).not.toBeInTheDocument();
  });

  it('summarises the driving days in the header', () => {
    const { open } = setup();
    open();

    expect(screen.getByText('Trip overview')).toBeInTheDocument();
    expect(screen.getByText(/3 days · 2 driving · 815 km/)).toBeInTheDocument();
  });

  it('shows driving days as cards and rest days as one line', () => {
    const { open } = setup();
    open();

    expect(screen.getAllByRole('button', { name: /View route/ })).toHaveLength(2);
    expect(screen.getByText('Rest day in Cologne')).toBeInTheDocument();
    expect(screen.getByText('via Utrecht, Arnhem')).toBeInTheDocument();
    expect(screen.getByText('Wed, Jul 1')).toBeInTheDocument();
  });

  it('reports the selected day', async () => {
    const { open, onDayClick } = setup();
    open();

    await userEvent.click(screen.getByRole('button', { name: 'View route for day 3' }));

    expect(onDayClick).toHaveBeenCalledWith('3');
  });
});
