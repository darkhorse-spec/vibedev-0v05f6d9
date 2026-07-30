import { AppState, Direction, Distance, PLANTS, PlantId } from './data';
import { assessLight, resetForPlant } from './model';

const $ = <T extends Element>(s: string): T => document.querySelector<T>(s)!;
let state: AppState = { plant: 'orchid', direction: 'west', distance: 'near' };
const plants = $('#plants') as HTMLElement;
const distances = $('#distances') as HTMLElement;
const result = $('#result') as HTMLElement;
const names: Record<Distance, [string, string]> = { near: ['NEAR', '< 1 m'], mid: ['MID', '1–3 m'], far: ['FAR', '3 m+'] };

function moveRadio(event: KeyboardEvent, group: HTMLElement): void {
  const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
  if (!(event.key in keys)) return;
  const items = Array.from(group.querySelectorAll<HTMLElement>('[role="radio"]'));
  const current = items.indexOf(document.activeElement as HTMLElement);
  if (current < 0) return;
  event.preventDefault();
  const next = items[(current + keys[event.key] + items.length) % items.length]; next.focus(); next.click();
}

function wireRadio(button: HTMLButtonElement, group: HTMLElement): void {
  button.type = 'button'; button.setAttribute('role', 'radio'); button.setAttribute('aria-checked', 'false');
  button.addEventListener('keydown', event => moveRadio(event, group));
}

for (const id of Object.keys(PLANTS) as PlantId[]) {
  const button = document.createElement('button');
  button.textContent = PLANTS[id].label; wireRadio(button, plants);
  button.onclick = (): void => { state = resetForPlant(id); render(); };
  plants.append(button);
}
for (const distance of Object.keys(names) as Distance[]) {
  const button = document.createElement('button'); button.dataset.distance = distance;
  button.textContent = distance === 'mid' ? 'MID-ROOM' : names[distance][0]; wireRadio(button, distances);
  const small = document.createElement('small'); small.textContent = names[distance][1]; button.append(small);
  button.onclick = (): void => { state.distance = distance; render(); };
  distances.append(button);
}
const directionGroup = $('.compass') as HTMLElement;
document.querySelectorAll<HTMLButtonElement>('[data-direction]').forEach(button => {
  wireRadio(button, directionGroup);
  button.onclick = (): void => { state.direction = button.dataset.direction as Direction; render(); };
});

function render(): void {
  const plantIds = Object.keys(PLANTS);
  plants.querySelectorAll('button').forEach((button, index) => button.setAttribute('aria-checked', plantIds[index] === state.plant ? 'true' : 'false'));
  directionGroup.querySelectorAll<HTMLButtonElement>('[data-direction]').forEach(button => button.setAttribute('aria-checked', button.dataset.direction === state.direction ? 'true' : 'false'));
  distances.querySelectorAll('button').forEach(button => button.setAttribute('aria-checked', button.dataset.distance === state.distance ? 'true' : 'false'));
  if (!state.plant || !state.direction || !state.distance) {
    result.className = 'result empty'; result.textContent = '';
    const step = document.createElement('p'); step.className = 'eyebrow'; step.textContent = '04 · LIGHT FIT'; result.append(step);
    const heading = document.createElement('h2'); heading.textContent = 'Build your light check'; result.append(heading);
    const message = document.createElement('p'); message.textContent = !state.plant ? 'Choose a plant, window direction, and distance.' : !state.direction ? 'Choose the window direction.' : 'Now choose the distance from the window.'; result.append(message);
    return;
  }
  const assessment = assessLight(state.plant, state.direction, state.distance), profile = PLANTS[state.plant];
  const title = assessment.verdict === 'great' ? '✅ Great Match' : assessment.verdict === 'dark' ? '❌ Too Dark — choose a different spot' : '⚠️ Marginal' + (assessment.estimatedFc > profile.maxFc ? '' : ' — consider a grow light');
  result.className = 'result ' + assessment.verdict; result.textContent = '';
  const add = (tag: string, className: string, text: string): HTMLElement => { const node = document.createElement(tag); node.className = className; node.textContent = text; result.append(node); return node; };
  add('p', 'eyebrow', '04 · LIGHT FIT'); add('h2', '', title); add('p', 'detail', assessment.detail);
  const metrics = document.createElement('div'); metrics.className = 'metrics';
  for (const value of [[assessment.estimatedFc.toLocaleString() + ' fc', 'ESTIMATED'], [assessment.minFc.toLocaleString() + '–' + assessment.maxFc.toLocaleString() + ' fc', 'IDEAL RANGE']] as [string, string][]) { const metric = document.createElement('div'); metric.className = 'metric'; const strong = document.createElement('strong'); strong.textContent = value[0]; const small = document.createElement('small'); small.textContent = value[1]; metric.append(strong, small); metrics.append(metric); }
  result.append(metrics);
  const meter = document.createElement('div'); meter.className = 'meter'; meter.setAttribute('role', 'img'); meter.setAttribute('aria-label', `Estimated light ${assessment.estimatedFc} foot-candles; ideal range ${assessment.minFc} to ${assessment.maxFc} foot-candles.`);
  const ideal = document.createElement('i'); ideal.className = 'ideal'; ideal.style.left = Math.min(assessment.minFc / 20, 100) + '%'; ideal.style.width = Math.min((assessment.maxFc - assessment.minFc) / 20, 100 - assessment.minFc / 20) + '%';
  const marker = document.createElement('b'); marker.className = 'marker'; marker.style.left = `clamp(4px, ${Math.min(Math.max(assessment.estimatedFc / 20, 0), 100)}%, calc(100% - 4px))`; meter.append(ideal, marker); result.append(meter); add('p', '', assessment.tip);
}
render();
