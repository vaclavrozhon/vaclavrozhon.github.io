"""Browser regression checks. Serve the repo first; see ../README.md."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:8765/teaching/markov_chains/')
parser.add_argument('--chromium')
parser.add_argument('--screenshots', type=Path)
args = parser.parse_args()
with sync_playwright() as p:
    launch = {'headless': True, 'args': ['--no-sandbox']}
    if args.chromium: launch['executable_path'] = args.chromium
    browser = p.chromium.launch(**launch)
    page = browser.new_page(viewport={'width': 1366, 'height': 900}, ignore_https_errors=True)
    errors, csv_requests = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: csv_requests.append(request.url) if 'markov_k' in request.url else None)
    page.goto(args.url, wait_until='domcontentloaded', timeout=60000)
    expect(page.get_by_role('button', name='Step', exact=True)).to_be_enabled()
    assert not csv_requests, 'Sidebar must not construct or fetch language models'
    # Capture the actual displayed model for assertions without a production debug API.
    page.evaluate('''() => {
        const draw = MarkovChain.prototype.draw;
        MarkovChain.prototype.draw = function (...args) { window.testChain = this; return draw.apply(this, args); };
    }''')
    page.get_by_role('button', name='Fit graph').click()
    page.wait_for_function('window.testChain !== undefined')
    step = page.locator('.step-count')
    def select(index):
        page.locator('.chain-button').nth(index).click()
        page.wait_for_function('(name) => window.testChain?.constructor.meta.name === name', arg=page.locator('.chain-button').nth(index).locator('.chain-name').inner_text())
    def run(count):
        page.get_by_role('spinbutton', name='Run steps').fill(str(count))
        page.get_by_role('button', name='Run', exact=True).click()
    def screenshot(name):
        if args.screenshots:
            args.screenshots.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(args.screenshots / name), full_page=True)

    page.get_by_role('slider', name='Speed', exact=True).fill('2000')  # 50 ms/step
    run(3)
    expect(step).to_have_text('Step: 3')
    expect(page.get_by_role('button', name='Run', exact=True)).to_be_enabled()
    run(2)
    expect(step).to_have_text('Step: 5')
    assert not csv_requests
    print('PASS exact Run budget and no repeated CSV fetches', flush=True)

    page.get_by_role('combobox', name='Dots').select_option('10000')
    page.get_by_role('slider', name='Speed', exact=True).fill('1850')  # 200 ms/step
    run(100)
    page.wait_for_function('testChain.stepCount >= 2')
    page.get_by_role('button', name='Stop', exact=True).click()
    at_stop = page.evaluate('testChain.stepCount')
    page.wait_for_timeout(500)
    after_stop = page.evaluate('testChain.stepCount')
    assert after_stop in [at_stop, at_stop + 1]
    page.wait_for_timeout(300)
    assert page.evaluate('testChain.stepCount') == after_stop
    assert page.evaluate('testChain.stateCount.reduce((a,b) => a+b, 0) === 10000')
    page.get_by_role('combobox', name='Dots').select_option('0')
    expect(page.get_by_role('button', name='Run', exact=True)).to_be_disabled()
    expect(page.get_by_role('button', name='Step', exact=True)).to_be_disabled()
    expect(step).to_have_text('Step: 0')
    page.get_by_role('combobox', name='Dots').select_option('100')
    page.get_by_role('slider', name='Speed', exact=True).fill('2000')
    run(5)
    expect(step).to_have_text('Step: 5')
    print('PASS Stop at a transition boundary and 0/10,000 dots', flush=True)

    page.get_by_role('slider', name='Speed', exact=True).fill('1050')  # 1000 ms/step
    run(3)
    page.get_by_role('button', name='Zoom in', exact=True).click()
    expect(step).to_have_text('Step: 5')
    page.get_by_role('button', name='Reset', exact=True).click()
    page.wait_for_timeout(1150)
    expect(step).to_have_text('Step: 0')
    assert page.evaluate('testChain.dots.every(d => Number.isFinite(d.x) && Number.isFinite(d.y))')
    print('PASS zoom during animation and reset during Run', flush=True)

    select(3)
    run(5)
    page.get_by_role('slider', name='Right probability (p)', exact=True).fill('0.8')
    expect(step).to_have_text('Step: 0')
    page.wait_for_timeout(1100)
    expect(step).to_have_text('Step: 0')
    page.evaluate('window.previousChain = testChain')
    page.get_by_role('combobox', name='Dots').select_option('1000')
    expect(page.locator('.chain-header')).to_contain_text('p=0.80')
    assert page.evaluate('testChain === previousChain && testChain.p === 0.8 && testChain.numDots === 1000')
    page.get_by_role('slider', name='Start position', exact=True).fill('0')
    expect(page.locator('.histogram')).to_contain_text('Completed: 1000 / 1000')
    expect(page.locator('.histogram-stats')).to_contain_text('Mean: 0.0')
    page.wait_for_function("Chart.getChart(document.querySelector('.histogram canvas')).data.datasets[0].data[0]?.y === 1")
    page.get_by_role('slider', name='Start position', exact=True).fill('4')
    expect(page.locator('.histogram')).to_contain_text('Completed: 0 / 1000')
    screenshot('random-walk.png')
    print('PASS parameter restart, model preservation and zero-time absorption', flush=True)

    select(9)
    page.get_by_role('slider', name='Damping α', exact=True).fill('0.85')
    page.get_by_role('combobox', name='Dots').select_option('10')
    assert page.evaluate('testChain.dampingFactor === 0.85')
    expect(page.locator('.controls')).to_contain_text('0.85')
    select(5)
    page.get_by_role('slider', name='Coupons', exact=True).fill('25')
    page.get_by_role('slider', name='Speed', exact=True).fill('2000')
    run(3)
    expect(step).to_have_text('Step: 3')
    page.get_by_role('slider', name='Coupons', exact=True).fill('2')
    expect(step).to_have_text('Step: 0')
    assert page.evaluate('testChain.states.length === 3 && testChain.stateCount[0] === 10')
    print('PASS PageRank precision and coupon-count restart', flush=True)

    select(6)
    run(2)
    expect(step).to_have_text('Step: 2')
    page.locator('.controls').get_by_role('button', name='Snakes & Ladders', exact=True).click()
    page.get_by_role('spinbutton', name='End square 1', exact=True).fill('39')
    page.get_by_role('button', name='Save', exact=True).click()
    expect(step).to_have_text('Step: 0')
    assert page.evaluate('testChain.specials[2] === 39 && testChain.transitionMatrix[0][39] > 0 && testChain.transitionMatrix[0][38] === 0')
    page.locator('.controls').get_by_role('button', name='Snakes & Ladders', exact=True).click()
    page.get_by_role('spinbutton', name='End square 1', exact=True).fill('100')
    page.get_by_role('button', name='Save', exact=True).click()
    expect(page.get_by_role('alert')).to_contain_text('1 to 99')
    assert page.evaluate('testChain.specials[2] === 39')
    page.get_by_role('button', name='Close', exact=True).click()
    print('PASS mapping save and validation', flush=True)

    select(7)
    expect(page.get_by_role('button', name='Step', exact=True)).to_be_enabled(timeout=15000)
    page.get_by_role('combobox', name='Dots').select_option('100')
    run(15)
    expect(step).to_have_text('Step: 15', timeout=15000)
    assert page.evaluate('testChain.generatedWords.length > 0 && testChain.generatedWords.length === testChain.absorbedCount')
    fractions = page.evaluate("Chart.getChart(document.querySelector('.histogram canvas')).data.datasets[0].data.reduce((sum, p) => sum + p.y, 0)")
    completed = page.evaluate('testChain.absorbedCount / testChain.numDots')
    assert abs(fractions - completed) < 1e-10
    page.get_by_role('button', name='Reset', exact=True).click()
    expect(page.locator('h4').filter(has_text='Generated Words')).to_have_text('Generated Words (0 total)')
    select(0); select(7)
    expect(page.get_by_role('button', name='Step', exact=True)).to_be_enabled()
    assert sum('markov_k1.csv' in url for url in csv_requests) == 1
    print('PASS generated words reset, histogram denominator and CSV cache', flush=True)

    select(8)
    expect(page.get_by_role('button', name='Step', exact=True)).to_be_enabled(timeout=15000)
    page.get_by_role('button', name='Show full transition matrix').click()
    expect(page.locator('.matrix-navigation')).to_contain_text('Rows 1–30 of 730')
    assert page.locator('.transition-matrix td').count() == 900
    page.get_by_role('button', name='Next matrix columns').click()
    expect(page.locator('.matrix-navigation')).to_contain_text('Columns 31–60 of 730')
    page.get_by_role('button', name='Hide full transition matrix').click()
    run(25)
    expect(step).to_have_text('Step: 25', timeout=20000)
    assert page.evaluate('testChain.generatedWords.length > 0 && testChain.generatedWords.length === testChain.absorbedCount')
    screenshot('bigrams.png')
    print('PASS bigram generation, absorption and bounded matrix rendering', flush=True)

    # Every example renders, including at projector and phone widths.
    for index in range(11):
        select(index)
        page.get_by_role('button', name='Fit graph').click()
    for width in [1024, 390]:
        page.set_viewport_size({'width': width, 'height': 900})
        page.wait_for_timeout(250)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'Page overflow at {width}px'
        assert page.locator('.canvas-container').bounding_box()['width'] < width
    screenshot('mobile.png')
    assert not errors, errors
    print('PASS all 11 examples, responsive layout and zero browser exceptions', flush=True)

    # A failed CSV request gives a recoverable error and cannot start an empty simulation.
    retry = browser.new_page(ignore_https_errors=True)
    retry.on('pageerror', lambda error: errors.append(str(error)))
    retry.route('**/markov_k1.csv', lambda route: route.fulfill(status=503, body='Unavailable'))
    retry.goto(args.url, wait_until='domcontentloaded', timeout=60000)
    retry.locator('.chain-button').nth(7).click()
    expect(retry.get_by_role('alert')).to_contain_text('HTTP 503')
    expect(retry.get_by_role('button', name='Step', exact=True)).to_be_disabled()
    retry.unroute('**/markov_k1.csv')
    retry.locator('.chain-button').nth(7).click()
    expect(retry.get_by_role('button', name='Step', exact=True)).to_be_enabled(timeout=15000)
    expect(retry.get_by_role('alert')).to_have_count(0)
    assert not errors, errors
    print('PASS visible load failure and retry', flush=True)
    browser.close()
