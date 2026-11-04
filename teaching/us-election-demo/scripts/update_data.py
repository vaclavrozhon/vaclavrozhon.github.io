#!/usr/bin/env python3
"""Freeze public polling facts. Requires requests and openpyxl; no account needed.

python3 scripts/update_data.py --as-of 2026-11-02 --since 2026-10-01
Use --cache /tmp to reuse the downloaded silver-{polls,generic}.csv and fec2024.xlsx.
"""
import argparse
import csv
import datetime as dt
import io
import json
from pathlib import Path
import requests
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
SENATE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSyuZYuGnnjFdpjryAiGq6SeRe0ZOoGHKYzPzbxF1X_Ee_cE7411tTGdUbpRerX8_Xe7uRfw_Rkd1Hj/pub?gid=523113073&single=true&output=csv'
GENERIC = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRsvXNCZ0ubJr8D_yNcU5q6C0_HBa35K7oDK03KpO7Ca43UwdXaIdvVLWoXEmHHph0EREz5430Hm5yZ/pub?output=csv'
FEC = 'https://www.fec.gov/resources/cms-content/documents/2024presgeresults.xlsx'
SILVER = 'https://www.natesilver.net/p/nate-silver-2026-midterm-election-polls-model'
SILVER_GENERIC = 'https://www.natesilver.net/p/generic-ballot-average-2026-nate-silver-bulletin-congress-polls'
SENATE_FACTS = 'https://www.dailypress.senate.gov/on-the-floor/senate-facts/'
NAMES = dict(pair.split(':', 1) for pair in 'AL:Alabama|AK:Alaska|AR:Arkansas|CO:Colorado|DE:Delaware|FL:Florida|GA:Georgia|ID:Idaho|IL:Illinois|IA:Iowa|KS:Kansas|KY:Kentucky|LA:Louisiana|ME:Maine|MA:Massachusetts|MI:Michigan|MN:Minnesota|MS:Mississippi|MT:Montana|NE:Nebraska|NH:New Hampshire|NJ:New Jersey|NM:New Mexico|NC:North Carolina|OH:Ohio|OK:Oklahoma|OR:Oregon|RI:Rhode Island|SC:South Carolina|SD:South Dakota|TN:Tennessee|TX:Texas|VA:Virginia|WV:West Virginia|WY:Wyoming'.split('|'))
DEM_HELD = 'CO DE GA IL MA MI MN NH NJ NM OR RI VA'.split()
INDEPENDENTS = {'ID': 'Achilles', 'MT': 'Bodnar', 'NE': 'Osborn', 'SD': 'Bengs'}
REGIONS = {
    'Northeast': 'ME MA NH NJ RI',
    'Midwest': 'IL IA KS MI MN NE OH SD',
    'South': 'AL AR DE FL GA KY LA MS NC OK SC TN TX VA WV',
    'West': 'AK CO ID MT NM OR WY',
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--as-of', default='2026-11-02')
    parser.add_argument('--since', default='2026-10-01')
    parser.add_argument('--cache', type=Path)
    args = parser.parse_args()
    cutoff = dt.date.fromisoformat(args.as_of)

    def get(url, name):
        path = args.cache / name if args.cache else None
        if path and path.exists():
            return path.read_bytes()
        response = requests.get(url, timeout=45)
        response.raise_for_status()
        return response.content

    senate = list(csv.DictReader(io.StringIO(get(SENATE, 'silver-polls.csv').decode())))
    national = list(csv.DictReader(io.StringIO(get(GENERIC, 'silver-generic.csv').decode())))
    workbook = openpyxl.load_workbook(io.BytesIO(get(FEC, 'fec2024.xlsx')), data_only=True)
    results = {}
    for row in workbook.active.values:
        if isinstance(row[0], str) and len(row[0]) == 2 and isinstance(row[12], (int, float)):
            results[row[0]] = {'dem': row[12], 'rep': row[24], 'total': row[30]}
    assert len(results) == 51, 'Expected all 50 states and DC from the FEC workbook'
    national_margin = 100 * (sum(r['dem'] - r['rep'] for r in results.values())) / sum(r['total'] for r in results.values())
    races = []
    for state, name in NAMES.items():
        result = results[state]
        margin = 100 * (result['dem'] - result['rep']) / result['total']
        races.append(dict(state=state, name=name, region=next(k for k, v in REGIONS.items() if state in v.split()),
                          heldBy='D' if state in DEM_HELD else 'R', special=state in ['FL', 'OH'],
                          independent=state in INDEPENDENTS, challenger=INDEPENDENTS.get(state, 'Democratic candidate'),
                          republican='Republican candidate', margin2024=round(margin, 4), lean=round(margin-national_margin, 4)))
    race_by_state = {r['state']: r for r in races}
    eligible = [r for r in senate if '-S' in r['id'] and args.since <= r['endDate'] <= args.as_of]
    eligible.sort(key=lambda r: (r['endDate'], float(r['sample'] or 0)), reverse=True)
    # Freeze each race's actual latest matchup, rejecting obsolete hypothetical opponents.
    for state, race in race_by_state.items():
        for r in eligible:
            if r['id'][5:7] != state:
                continue
            choices = [(r[f'name{i}'], r[f'party{i}'], r[f'value{i}']) for i in range(1, 5)]
            opponent = next((c for c in choices if c[0] == INDEPENDENTS[state]), None) if race['independent'] else next((c for c in choices if c[1] == 'D'), None)
            republicans = [c for c in choices if c[1] == 'R' and c[2]]
            if opponent and republicans:
                race['challenger'] = opponent[0]
                race['republican'] = max(republicans, key=lambda c: float(c[2]))[0]
                break
    selected = {}
    for r in eligible:
        state = r['id'][5:7]
        if state not in race_by_state:
            continue
        race = race_by_state[state]
        choices = {r[f'name{i}']: r[f'value{i}'] for i in range(1, 5) if r[f'name{i}'] and r[f'value{i}']}
        if race['challenger'] not in choices or race['republican'] not in choices:
            continue
        n = float(r['sample'] or 0)
        if n <= 0:
            continue
        key = (state, r['pollster'])
        if key in selected:
            continue
        selected[key] = dict(state=state, pollster=r['pollster'], start=r['startDate'], end=r['endDate'], n=n,
                             population=r['population'], challenger=float(choices[race['challenger']]),
                             republican=float(choices[race['republican']]),
                             margin=round(float(choices[race['challenger']])-float(choices[race['republican']]), 4),
                             partisan=r['partisan'], url=r['url'], source='Silver Bulletin / NYT')
    state_polls = sorted(selected.values(), key=lambda r: (r['state'], r['end']), reverse=True)

    def date(value):
        return dt.datetime.strptime(value, '%m/%d/%Y').date().isoformat()
    selected = {}
    national.sort(key=lambda r: (date(r['enddate']), {'LV': 3, 'RV': 2, 'A': 1}.get(r['population'].strip(), 0), float(r['samplesize'] or 0)), reverse=True)
    for r in national:
        end = date(r['enddate'])
        if not args.since <= end <= args.as_of or r['pollster'] in selected:
            continue
        if not r['samplesize'].strip() or float(r['samplesize']) <= 0:
            continue
        selected[r['pollster']] = dict(pollster=r['pollster'], start=date(r['startdate']), end=end, n=float(r['samplesize']),
                                      population=r['population'].strip(), dem=float(r['dem']), rep=float(r['rep']),
                                      margin=round(float(r['dem'])-float(r['rep']), 4), partisan=r['partisan'], url=r['url'],
                                      source='Silver Bulletin', pollId=r['poll_id'])
    national_polls = list(selected.values())
    for poll in state_polls + national_polls:
        poll['ageDays'] = (cutoff - dt.date.fromisoformat(poll['end'])).days
    sources = [dict(label='Silver Bulletin: Senate polling data', url=SILVER, download=SENATE),
               dict(label='Silver Bulletin: generic ballot', url=SILVER_GENERIC, download=GENERIC),
               dict(label='FEC: official 2024 presidential results', url=FEC),
               dict(label='U.S. Senate: seats and party lineup', url=SENATE_FACTS),
               dict(label='U.S. Senate: vice-presidential tie-breaking', url='https://www.senate.gov/legislative/TieVotes.htm'),
               dict(label='Independent candidates and caucus uncertainty', url='https://apnews.com/article/106c5ad829c53b71bdf18a501fc6e07f')]
    data = dict(asOf=args.as_of, windowStart=args.since, retrieved=dt.datetime.now(dt.timezone.utc).date().isoformat(), electionDay='2026-11-03',
                baselineNationalMargin=round(national_margin, 6), fixedSeats=dict(dem=34, rep=31), races=races,
                statePolls=state_polls, nationalPolls=national_polls, sources=sources,
                selection=f'Latest survey per pollster per race, ending {args.since} to {args.as_of}; latest actual candidate matchup; positive known sample size. National ties prefer LV, then RV, then adults, then larger n. Raw published margins; no Silver Bulletin adjustments or forecast probabilities. Unpolled races use the prior.')
    (ROOT/'src/data').mkdir(exist_ok=True)
    (ROOT/'src/data/snapshot2026.json').write_text(json.dumps(data, indent=2, ensure_ascii=False)+'\n')
    for name, rows in [('senate-polls-2026', state_polls), ('national-polls-2026', national_polls), ('race-baselines-2024', races)]:
        with (ROOT/f'public/data/{name}.csv').open('w') as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0]))
            writer.writeheader()
            writer.writerows(rows)
    assert len(races) == 35 and sum(r['heldBy']=='D' for r in races) == 13
    print(f'{len(races)} races; {len(state_polls)} state polls across {len(set(p["state"] for p in state_polls))} states; {len(national_polls)} national polls.')


if __name__ == '__main__':
    main()
