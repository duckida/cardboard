import { describe, expect, it } from 'vitest';
import { normalizeSportsUrl, parseSportsFixtures } from '../api/_lib/sports';

const html = `
<table class="TeamsTable CalendarListTable">
  <tr><td colspan="7"><a class="CalListDateButton" href="CalendarDay.asp?ID=2272&D=25&M=11&Y=2026"><span class="CalListDaySpan">Wed</span><span class="CalListDateSpan">25 Nov</span><span class="CalListYearSpan">2026</span></a></td></tr>
  <tr><td style="text-align:center; width:100px;background:#eee; border:0!important"><td style="text-align:center;"><img class="SportIcon" src="15.gif"/></td><td>14:15</td><td><b>Hockey</b> <a href="iframefixturedetails.asp?Id=2272&FID=1" class="FixtureDetailsLink">Girls-U13A</a></td><td>v Luckley House School</td><td>H</td></tr>
  <tr><td style="text-align:center; width:100px;height:50px;background:#eee; border:0"><td colspan="6" style="border:0">&nbsp;</td></tr>
  <tr><td colspan="7"><a class="CalListDateButton" href="CalendarDay.asp?ID=2272&D=26&M=11&Y=2026"><span class="CalListDaySpan">Thu</span><span class="CalListDateSpan">26 Nov</span><span class="CalListYearSpan">2026</span></a></td></tr>
  <tr><td style="text-align:center; width:100px;background:#eee; border:0!important"><td style="text-align:center;"><img class="SportIcon" src="24.gif"/></td><td>14:30</td><td><b>Rugby Union</b> <a href="x" class="FixtureDetailsLink">Boys-U13A</a>, <a href="y" class="FixtureDetailsLink">Boys-U13B</a></td><td>v Papplewick School</td><td>tbc</td></tr>
  <tr><td style="text-align:center; width:100px;background:#eee; border:0!important"><td style="text-align:center;"><img class="SportIcon" src="24.gif"/></td><td>14:30</td><td><b>Rugby Union</b> <a href="x" class="FixtureDetailsLink">Boys-U13A</a>, <a href="y" class="FixtureDetailsLink">Boys-U13B</a></td><td>v Papplewick School</td><td>tbc</td></tr>
</table>`;

describe('parseSportsFixtures', () => {
  it('reads dates, sports, times, teams, opponents and venues', () => {
    const fixtures = parseSportsFixtures(html);

    expect(fixtures).toHaveLength(2);
    expect(fixtures[0]).toMatchObject({
      date: '2026-11-25',
      time: '14:15',
      sport: 'Hockey',
      teams: ['Girls-U13A'],
      opponent: 'Luckley House School',
      venue: 'H',
    });
    expect(fixtures[1]).toMatchObject({
      date: '2026-11-26',
      time: '14:30',
      sport: 'Rugby Union',
      teams: ['Boys-U13A', 'Boys-U13B'],
      opponent: 'Papplewick School',
      venue: 'TBC',
    });
  });
});

describe('normalizeSportsUrl', () => {
  it('turns the month page into the list view', () => {
    expect(normalizeSportsUrl('https://sports.example.org/Calendar.asp?Id=2272')).toBe(
      'https://sports.example.org/CalendarList.asp?Id=2272',
    );
  });

  it('rejects non-http links', () => {
    expect(normalizeSportsUrl('webcal://sports.example.org/Calendar.asp')).toBeNull();
  });
});
