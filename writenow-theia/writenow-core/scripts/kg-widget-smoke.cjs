/* eslint-disable no-console */

/**
 * Headless widget verification for the Knowledge Graph widget.
 *
 * Why: In CI/containers we often cannot start the full Theia UI stack. This script validates:
 * - SVG renders entities + relations (visualization)
 * - pan/zoom updates the view transform (interaction)
 * - node drag updates node position (interaction)
 *
 * Notes:
 * - Uses a real SQLite database via the real backend services (no stub persistence).
 * - Uses JSDOM to host the React widget view for event simulation.
 */

const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');

const { JSDOM } = require('jsdom');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createLogger() {
  return {
    error: (message) => console.error(message),
    warn: (message) => console.warn(message),
    info: (message) => console.info(message),
    debug: (_message) => undefined,
  };
}

async function main() {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    pretendToBeVisual: true,
    url: 'http://localhost/',
  });

  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.Element = dom.window.Element;
  global.SVGElement = dom.window.SVGElement;
  global.Node = dom.window.Node;
  global.navigator = dom.window.navigator;
  global.DragEvent = dom.window.DragEvent || dom.window.Event;
  global.DataTransfer = dom.window.DataTransfer || class DataTransfer {};

  if (!dom.window.PointerEvent) {
    dom.window.PointerEvent = dom.window.MouseEvent;
  }
  if (!dom.window.Element.prototype.setPointerCapture) {
    dom.window.Element.prototype.setPointerCapture = () => undefined;
  }
  if (!dom.window.Element.prototype.releasePointerCapture) {
    dom.window.Element.prototype.releasePointerCapture = () => undefined;
  }

  const ReactDOMClient = require('react-dom/client');

  const { TheiaInvokeRegistry, toIpcError } = require('../lib/node/theia-invoke-adapter');
  const { WritenowSqliteDb } = require('../lib/node/database/writenow-sqlite-db');
  const { ProjectsService } = require('../lib/node/services/projects-service');
  const { KnowledgeGraphService } = require('../lib/node/services/knowledge-graph-service');
  const { KnowledgeGraphWidget } = require('../lib/browser/knowledge-graph/knowledge-graph-widget');

  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'writenow-theia-kg-widget-smoke-'));
  const logger = createLogger();
  const sqliteDb = new WritenowSqliteDb(logger, dataDir);
  sqliteDb.ensureReady();

  const registry = new TheiaInvokeRegistry();
  const projectsService = new ProjectsService(logger, sqliteDb);
  const knowledgeGraphService = new KnowledgeGraphService(logger, sqliteDb);
  projectsService.register(registry);
  knowledgeGraphService.register(registry);

  const rpc = {
    invoke: async (channel, payload) => {
      const handler = registry.get(channel);
      if (!handler) {
        return { ok: false, error: { code: 'NOT_FOUND', message: 'IPC channel not found', details: { channel } } };
      }
      try {
        const data = await handler(undefined, payload);
        return { ok: true, data };
      } catch (error) {
        return { ok: false, error: toIpcError(error) };
      }
    },
  };

  const bootstrap = await rpc.invoke('project:bootstrap', {});
  assert.equal(bootstrap.ok, true);
  const projectId = bootstrap.data.currentProjectId;
  assert.ok(projectId);

  const e1 = await rpc.invoke('kg:entity:create', { projectId, type: 'Character', name: 'Alice' });
  const e2 = await rpc.invoke('kg:entity:create', { projectId, type: 'Character', name: 'Bob' });
  assert.equal(e1.ok, true);
  assert.equal(e2.ok, true);

  const r1 = await rpc.invoke('kg:relation:create', { projectId, fromEntityId: e1.data.entity.id, toEntityId: e2.data.entity.id, type: 'knows' });
  assert.equal(r1.ok, true);

  const writenow = {
    invokeResponse: (channel, payload) => rpc.invoke(channel, payload),
  };

  const widget = new KnowledgeGraphWidget(writenow);
  widget.requestRefresh();

  const reactRoot = ReactDOMClient.createRoot(dom.window.document.getElementById('root'));
  reactRoot.render(widget.render());

  // Wait for initial effects (project bootstrap + kg:graph:get) to settle.
  let svg = null;
  for (let i = 0; i < 40; i += 1) {
    await sleep(50);
    svg = dom.window.document.querySelector('svg');
    const circles = svg ? svg.querySelectorAll('circle') : [];
    if (circles.length >= 2) break;
  }
  assert.ok(svg, 'expected widget to render an <svg>');

  const circles = svg.querySelectorAll('circle');
  const lines = svg.querySelectorAll('line');
  assert.ok(circles.length >= 2, `expected >= 2 nodes, got ${circles.length}`);
  assert.ok(lines.length >= 2, `expected >= 2 line elements, got ${lines.length}`);
  console.info('[kg-widget-smoke] visualization: ok');

  const canvas = svg.parentElement;
  assert.ok(canvas, 'expected svg parent container');
  const viewG = svg.querySelector('g[transform]');
  assert.ok(viewG, 'expected view transform <g>');

  const beforeZoom = viewG.getAttribute('transform');
  canvas.dispatchEvent(new dom.window.WheelEvent('wheel', { deltaY: -120, clientX: 100, clientY: 80, bubbles: true }));
  await sleep(50);
  const afterZoom = viewG.getAttribute('transform');
  assert.notEqual(afterZoom, beforeZoom, 'expected zoom to update view transform');
  console.info('[kg-widget-smoke] zoom: ok');

  const beforePan = viewG.getAttribute('transform');
  canvas.dispatchEvent(new dom.window.PointerEvent('pointerdown', { clientX: 10, clientY: 10, pointerId: 1, bubbles: true }));
  canvas.dispatchEvent(new dom.window.PointerEvent('pointermove', { clientX: 30, clientY: 40, pointerId: 1, bubbles: true }));
  canvas.dispatchEvent(new dom.window.PointerEvent('pointerup', { clientX: 30, clientY: 40, pointerId: 1, bubbles: true }));
  await sleep(50);
  const afterPan = viewG.getAttribute('transform');
  assert.notEqual(afterPan, beforePan, 'expected pan to update view transform');
  console.info('[kg-widget-smoke] pan: ok');

  const firstNode = circles[0].parentElement;
  assert.ok(firstNode, 'expected node group parent element');
  const beforeDrag = firstNode.getAttribute('transform');
  firstNode.dispatchEvent(new dom.window.PointerEvent('pointerdown', { clientX: 200, clientY: 150, pointerId: 2, bubbles: true }));
  firstNode.dispatchEvent(new dom.window.PointerEvent('pointermove', { clientX: 240, clientY: 180, pointerId: 2, bubbles: true }));
  firstNode.dispatchEvent(new dom.window.PointerEvent('pointerup', { clientX: 240, clientY: 180, pointerId: 2, bubbles: true }));
  await sleep(50);
  const afterDrag = firstNode.getAttribute('transform');
  assert.notEqual(afterDrag, beforeDrag, 'expected node drag to update node transform');
  console.info('[kg-widget-smoke] node drag: ok');

  reactRoot.unmount();
  console.info('[kg-widget-smoke] done');
}

main().catch((error) => {
  console.error('[kg-widget-smoke] failed', error);
  process.exit(1);
});
