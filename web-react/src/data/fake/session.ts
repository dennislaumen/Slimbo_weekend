/** URL switches for the fake backend: ?scenario=name&uid=u2&tab=spellen (dev:fake only). */
const params = () => new URLSearchParams(typeof location === 'undefined' ? '' : location.search)

export const uidFromUrl = () => params().get('uid') ?? 'u1'
export const scenarioFromUrl = () => params().get('scenario')

/** With ?scenario=…, open that weekend directly instead of showing the login screen. */
export function openScenarioFromUrl() {
  if (!scenarioFromUrl()) return
  try {
    localStorage.setItem('app_eventId', 'e1')
    const tab = params().get('tab')
    if (tab) localStorage.setItem('app_tab', tab)
  } catch {
    /* storage blocked */
  }
}
