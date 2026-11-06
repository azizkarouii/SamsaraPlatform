import { periodCovers, priceStretches, stretchesTotal, toDayMonth, toMonthDay } from './pricing';

describe('pricing', () => {
  const periods = [
    { startDate: '07-01', endDate: '07-07', pricePerDay: 100 },
    { startDate: '07-08', endDate: '07-31', pricePerDay: 200 },
    { startDate: '12-20', endDate: '01-10', pricePerDay: 30 },
  ];

  it('prices a stay day by day across periods: 3 at 100 then 7 at 200', () => {
    const stretches = priceStretches(150, periods, '2027-07-05', '2027-07-14');
    expect(stretches).toEqual([{ days: 3, pricePerDay: 100 }, { days: 7, pricePerDay: 200 }]);
    expect(stretchesTotal(stretches)).toBe(1700);
  });

  it('applies the periods every year', () => {
    expect(stretchesTotal(priceStretches(150, periods, '2031-07-05', '2031-07-14'))).toBe(1700);
  });

  it('uses the main price outside any period', () => {
    expect(priceStretches(150, periods, '2027-05-01', '2027-05-02')).toEqual([{ days: 2, pricePerDay: 150 }]);
  });

  it('handles a period crossing the new year', () => {
    expect(priceStretches(150, periods, '2027-12-30', '2028-01-02')).toEqual([{ days: 4, pricePerDay: 30 }]);
    expect(periodCovers(periods[2], '01-05')).toBeTrue();
    expect(periodCovers(periods[2], '06-15')).toBeFalse();
  });

  it('gives nothing without a price or with reversed dates', () => {
    expect(priceStretches(null, periods, '2027-07-05', '2027-07-14')).toEqual([]);
    expect(priceStretches(150, periods, '2027-07-14', '2027-07-05')).toEqual([]);
  });

  it('converts between the stored and the displayed day', () => {
    expect(toDayMonth('06-01')).toBe('01/06');
    expect(toMonthDay('01/06')).toBe('06-01');
  });
});
