#!/usr/bin/env node
/**
 * Fast unit tests for UI DOM primitives using a tiny fake document.
 *
 * These avoid a browser/jsdom dependency while locking the helper behavior that
 * keeps UI rendering on text nodes and explicit DOM/SVG construction.
 */
import assert from 'node:assert/strict';
import { test, run } from './test-lib/harness.mjs';

const registry = new Map();

function createFakeElement(tagName, namespaceURI = null) {
  return {
    tagName,
    namespaceURI,
    attributes: new Map(),
    children: [],
    textContent: '',
    className: '',
    value: '',
    style: {},
    disabled: false,
    scrollTop: 0,
    scrollHeight: 0,
    classList: {
      classes: new Set(),
      add(cls) { this.classes.add(cls); },
      remove(cls) { this.classes.delete(cls); },
      toggle(cls, force) {
        const next = force === undefined ? !this.classes.has(cls) : !!force;
        if (next) this.classes.add(cls);
        else this.classes.delete(cls);
        return next;
      },
      contains(cls) { return this.classes.has(cls); },
    },
    setAttribute(name, value) { this.attributes.set(name, `${value}`); },
    getAttribute(name) { return this.attributes.get(name); },
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = [...nodes]; },
  };
}

globalThis.document = {
  createElement: (tagName) => createFakeElement(tagName),
  createElementNS: (namespaceURI, tagName) => createFakeElement(tagName, namespaceURI),
  getElementById: (id) => registry.get(id) || null,
  querySelectorAll: () => [],
  documentElement: createFakeElement('html'),
  body: createFakeElement('body'),
  execCommand: () => false,
};

Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });

const {
  createSvgElement,
  replaceSvgChildren,
  renderTextList,
  removeChildren,
  setText,
} = await import('../modules/ui/dom.js');

test('createSvgElement creates SVG namespaced elements and stringifies attributes', () => {
  const circle = createSvgElement('circle', { cx: 50, cy: 25, fill: 'none', skipped: null });
  assert.equal(circle.tagName, 'circle');
  assert.equal(circle.namespaceURI, 'http://www.w3.org/2000/svg');
  assert.equal(circle.getAttribute('cx'), '50');
  assert.equal(circle.getAttribute('cy'), '25');
  assert.equal(circle.getAttribute('fill'), 'none');
  assert.equal(circle.getAttribute('skipped'), undefined);
});

test('replaceSvgChildren replaces children and filters null/undefined values', () => {
  const svg = createSvgElement('svg');
  const path = createSvgElement('path', { d: 'M 0 0' });
  replaceSvgChildren(svg, [null, path, undefined]);
  assert.deepEqual(svg.children, [path]);
});

test('renderTextList renders each item as text content with prefix and class', () => {
  const target = createFakeElement('div');
  registry.set('details', target);
  renderTextList('details', ['Alpha', '<b>Beta</b>'], { className: 'detail-line', prefix: '• ' });
  assert.equal(target.children.length, 2);
  assert.equal(target.children[0].tagName, 'p');
  assert.equal(target.children[0].className, 'detail-line');
  assert.equal(target.children[0].textContent, '• Alpha');
  assert.equal(target.children[1].textContent, '• <b>Beta</b>');
});

test('removeChildren clears an element via replaceChildren', () => {
  const target = createFakeElement('div');
  target.children = [createFakeElement('span')];
  removeChildren(target);
  assert.deepEqual(target.children, []);
});

test('setText writes stringified textContent', () => {
  const target = createFakeElement('div');
  setText(target, 123);
  assert.equal(target.textContent, '123');
});

await run('UI DOM tests');
