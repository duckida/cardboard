import type { ScheduleEvent } from '@shared/types';

function at(offsetDays: number, hour: number, minute: number, title: string, location: string, categories: string[], durationHours = 1): ScheduleEvent {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + offsetDays);
  start.setHours(hour, minute, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + durationHours);
  return {
    id: `demo-${offsetDays}-${hour}-${minute}-${title}`,
    title,
    start: start.toISOString(),
    end: end.toISOString(),
    allDay: false,
    location,
    categories,
  };
}

function allDay(offsetDays: number, title: string, categories: string[]): ScheduleEvent {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + offsetDays);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    id: `demo-allday-${offsetDays}-${title}`,
    title,
    start: start.toISOString(),
    end: end.toISOString(),
    allDay: true,
    categories,
  };
}

export function demoSchedule(daysAhead = 7): ScheduleEvent[] {
  const events: ScheduleEvent[] = [
    at(0, 8, 30, 'Morning briefing', 'Main hall', ['General']),
    at(0, 10, 15, 'U14 Football vs St Neots', 'Top field', ['Sport', 'Football']),
    at(0, 13, 30, 'Senior choir rehearsal', 'Music room', ['Music']),
    at(1, 9, 0, 'Year 10 exam skills workshop', 'Library', ['Senior School']),
    at(1, 14, 0, 'Hockey: U16 tournament', 'Astro', ['Sport', 'Hockey']),
    at(2, 9, 0, 'Prep assembly', 'Prep hall', ['Prep']),
    at(2, 16, 0, 'Parent-teacher meetings', 'Dining hall', ['Parent Events']),
    at(3, 11, 0, 'Rugby: 1st XV vs Pangbourne', 'Bottom field', ['Sport', 'Rugby']),
    at(4, 9, 0, 'House quiz', 'Main hall', ['General']),
    allDay(5, 'Inset day — no lessons', ['General']),
    at(6, 10, 0, 'Weekend sports fixtures', 'Sports centre', ['Sport']),
  ];
  return events.filter((event) => {
    const diff = new Date(event.start).getTime() - Date.now();
    return diff >= -86400000 && diff <= daysAhead * 86400000;
  });
}
