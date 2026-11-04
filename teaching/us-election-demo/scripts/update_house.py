#!/usr/bin/env python3
"""Freeze House preview inputs. Downloaded source files can be reused with --cache /tmp."""
import argparse
import csv
import datetime as dt
import io
import json
import re
from pathlib import Path
import requests
from update_data import SENATE as SILVER_POLLS

ROOT = Path(__file__).resolve().parents[1]
CENSUS = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer'
BASELINE = 'https://docs.google.com/spreadsheets/d/1eZfaFI-c-PFOoKx1-zZA2MP0_dxRq_LVK0re3BOQqy0/export?format=csv&gid=620838163'
OLD_BASELINE = 'https://docs.google.com/spreadsheets/d/1ng1i_Dm_RMDnEvauH44pgE6JCUsapcuu8F2pCfeLWFo/export?format=csv&gid=620838163'
FIPS = dict(pair.split(':') for pair in '01:AL 02:AK 04:AZ 05:AR 06:CA 08:CO 09:CT 10:DE 12:FL 13:GA 15:HI 16:ID 17:IL 18:IN 19:IA 20:KS 21:KY 22:LA 23:ME 24:MD 25:MA 26:MI 27:MN 28:MS 29:MO 30:MT 31:NE 32:NV 33:NH 34:NJ 35:NM 36:NY 37:NC 38:ND 39:OH 40:OK 41:OR 42:PA 44:RI 45:SC 46:SD 47:TN 48:TX 49:UT 50:VT 51:VA 53:WA 54:WV 55:WI 56:WY'.split())
REGIONS = {'Northeast':'CT ME MA NH NJ NY PA RI VT','Midwest':'IL IN IA KS MI MN MO NE ND OH SD WI','South':'AL AR DE FL GA KY LA MD MS NC OK SC TN TX VA WV','West':'AK AZ CA CO HI ID MT NV NM OR UT WA WY'}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache',type=Path)
    args=parser.parse_args()
    def get(url,name,params=None):
        cached=args.cache/name if args.cache else None
        if cached and cached.exists():return cached.read_text()
        response=requests.get(url,params=params,timeout=45);response.raise_for_status()
        return response.text
    senate=json.loads((ROOT/'src/data/snapshot2026.json').read_text())
    def baselines(text):
        return {row[0]:row for row in csv.reader(io.StringIO(text)) if row and re.fullmatch(r'[A-Z]{2}-(?:\d\d|AL)',row[0])}
    current=baselines(get(BASELINE,'house-baselines-2026.csv'))
    old=baselines(get(OLD_BASELINE,'house-baselines-2024.csv'))
    # The Census warns that its 120th file predates the Missouri court decision.
    # Restore BOTH geometry and baseline to the 119th/2024 lines, not just the labels.
    for key,row in old.items():
        if key.startswith('MO-'):current[key]=row
    assert len(current)==435
    def geometry(layer,name,where,column):
        params={'where':where,'outFields':f'GEOID,STATE,{column},NAME,INTPTLAT,INTPTLON','outSR':4326,'geometryPrecision':4,'maxAllowableOffset':0.004,'returnGeometry':'true','f':'geojson'}
        geo=json.loads(get(f'{CENSUS}/{layer}/query',name,params))
        assert 'features' in geo,geo
        return geo['features']
    features=geometry(0,'house-districts-120.geojson',"STATE < '60' AND STATE <> '11' AND CD120 <> 'ZZ'",'CD120')
    features=[f for f in features if f['properties']['STATE']!='29']+geometry(4,'house-districts-119mo.geojson',"STATE = '29'",'CD119')
    for feature in features:
        p=feature['properties'];state=FIPS[p['STATE']];number=p.get('CD120',p.get('CD119'))
        district=f'{state}-'+('AL' if number=='00' else number)
        assert district in current,district
        feature['properties']={'district':district,'state':state,'geoid':p['GEOID'],'vintage':'119th restored' if state=='MO' else '120th'}
        feature['id']=district
    assert len(features)==435 and len(set(f['id'] for f in features))==435
    (ROOT/'public/data/house-districts-2026.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features},separators=(',',':'))+'\n')
    races=[]
    for district,row in sorted(current.items()):
        state=district[:2];margin=float(row[5].replace('−','-').replace('%',''))
        races.append(dict(state=district,stateCode=state,name=district,region=next(k for k,v in REGIONS.items() if state in v.split()),
                          margin2024=margin,lean=round(margin-senate['baselineNationalMargin'],4),
                          independent=False,fixedWinner=None,challenger='Democratic candidate',republican='Republican candidate',
                          baselineSource='The Downballot: 2024 lines (Missouri restored)' if state=='MO' else 'The Downballot: 2026 lines'))
    by_id={r['state']:r for r in races}
    rows=list(csv.DictReader(io.StringIO(get(SILVER_POLLS,'silver-polls.csv'))))
    eligible=[]
    for row in rows:
        match=re.fullmatch(r'2026_([A-Z]{2})-(\d+)',row['id'])
        if not match or not senate['windowStart']<=row['endDate']<=senate['asOf']:continue
        state,number=match.groups();district=f'{state}-{int(number):02d}'
        if district not in by_id:district=f'{state}-AL'
        if district in by_id:eligible.append({**row,'district':district})
    eligible.sort(key=lambda r:(r['endDate'],float(r['sample'] or 0)),reverse=True)
    initialized=set()
    for row in eligible:
        district=row['district']
        if district in initialized:continue
        choices=[(row[f'name{i}'],row[f'party{i}'],float(row[f'value{i}'])) for i in range(1,5) if row[f'name{i}'] and row[f'value{i}']]
        race=by_id[district]
        if district=='AK-AL':left=next((c for c in choices if c[0]=='Hill'),None)
        else:left=next((c for c in choices if c[1]=='D'),None)
        right=next((c for c in choices if c[1]=='R' or (district=='CA-06' and c[0]=='Kiley')),None)
        if left and right:
            race.update(challenger=left[0],republican=right[0],independent=district=='AK-AL',opponentIndependent=district=='CA-06')
            initialized.add(district)
        elif len(choices)>=2 and all(c[1]=='D' for c in choices):
            race.update(fixedWinner='D',challenger='Democratic candidate',republican='No Republican on the two-candidate ballot')
            initialized.add(district)
    selected={}
    for row in eligible:
        district=row['district'];race=by_id[district];key=(district,row['pollster'])
        if key in selected or race['fixedWinner']:continue
        choices={row[f'name{i}']:float(row[f'value{i}']) for i in range(1,5) if row[f'name{i}'] and row[f'value{i}']}
        if race['challenger'] not in choices or race['republican'] not in choices:continue
        n=float(row['sample'] or 0)
        if n<=0:continue
        selected[key]=dict(state=district,pollster=row['pollster'],start=row['startDate'],end=row['endDate'],n=n,population=row['population'],
                           challenger=choices[race['challenger']],republican=choices[race['republican']],
                           margin=round(choices[race['challenger']]-choices[race['republican']],4),url=row['url'],partisan=row['partisan'],
                           ageDays=(dt.date.fromisoformat(senate['asOf'])-dt.date.fromisoformat(row['endDate'])).days)
    polls=list(selected.values())
    snapshot=dict(chamber='house',totalSeats=435,controlThresholds=dict(dem=218,rep=218),fixedSeats=dict(dem=0,rep=0),
                  asOf=senate['asOf'],windowStart=senate['windowStart'],retrieved=dt.datetime.now(dt.timezone.utc).date().isoformat(),
                  baselineNationalMargin=senate['baselineNationalMargin'],races=races,statePolls=polls,nationalPolls=senate['nationalPolls'],
                  sources=[dict(label='District boundaries · U.S. Census Bureau',url='https://www.census.gov/programs-surveys/decennial-census/about/rdo/congressional-districts.120th_Congress.html'),
                           dict(label='2024 vote on 2026 lines · The Downballot',url='https://www.the-downballot.com/p/the-downballots-calculations-of-presidential'),
                           dict(label='2026 House polls · Silver Bulletin / NYT',url='https://www.natesilver.net/p/nate-silver-2026-midterm-election-polls-model'),
                           dict(label='National polls · Silver Bulletin',url='https://www.natesilver.net/p/generic-ballot-average-2026-nate-silver-bulletin-congress-polls')])
    (ROOT/'src/data/house2026.json').write_text(json.dumps(snapshot,indent=2,ensure_ascii=False)+'\n')
    for name,rows in [('house-polls-2026',polls),('house-baselines-2026',races)]:
        fields=list(dict.fromkeys(k for r in rows for k in r))
        with (ROOT/f'public/data/{name}.csv').open('w') as f:
            writer=csv.DictWriter(f,fieldnames=fields);writer.writeheader();writer.writerows(rows)
    print(f'435 matching districts and baselines; {len(polls)} polls in {len(set(p["state"] for p in polls))} districts; {len(snapshot["nationalPolls"])} national polls.')


if __name__=='__main__':main()
