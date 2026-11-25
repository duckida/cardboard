import type { SportsFixture } from '@shared/types';

function day(offsetDays: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fixture(
  offsetDays: number,
  time: string,
  sport: string,
  teams: string[],
  opponent: string,
  venue: SportsFixture['venue'],
): SportsFixture {
  return {
    id: `demo-${offsetDays}-${time}-${sport}-${teams.join(',')}`,
    date: day(offsetDays),
    time,
    sport,
    teams,
    opponent,
    venue,
  };
}

export function demoSports(daysAhead = 14): SportsFixture[] {
  const fixtures = [
    fixture(0, '14:15', 'Hockey', ['Girls-U13A'], 'Luckley House School', 'H'),
    fixture(0, '14:30', 'Rugby Union', ['Boys-U13A', 'Boys-U13B'], "St Andrew's Prep School", 'A'),
    fixture(1, '15:30', 'Netball', ['Girls-U11A', 'Girls-U11B'], 'Bohunt School', 'H'),
    fixture(2, '14:30', 'Football', ['Boys-U9A', 'Boys-U9B'], 'Wellington College Prep', 'H'),
    fixture(4, '10:00', 'Swimming', ['Mixed-U16A'], 'ISA National Finals', 'A'),
    fixture(6, '14:15', 'Hockey Sevens', ['Girls-U11A'], 'Rupert House School', 'A'),
  ];
  const end = day(daysAhead);
  return fixtures.filter((item) => item.date <= end);
}
