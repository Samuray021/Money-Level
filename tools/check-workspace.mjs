import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { URL } from 'node:url';

const scope = '@money-level/';
const contracts = ['contracts'];
const finance = [...contracts, 'finance-core'];
const allowed = {
  contracts: [],
  'finance-core': contracts,
  analytics: finance,
  budgets: [...finance, 'analytics'],
  goals: finance,
  'meme-engine': contracts,
  gamification: contracts,
  application: [
    ...finance,
    'analytics',
    'budgets',
    'goals',
    'meme-engine',
    'gamification',
  ],
  'storage-indexeddb': [
    ...finance,
    'application',
    'budgets',
    'goals',
    'gamification',
  ],
  'ui-kit': contracts,
  web: [
    ...finance,
    'analytics',
    'budgets',
    'goals',
    'meme-engine',
    'gamification',
    'application',
    'storage-indexeddb',
    'ui-kit',
  ],
};

const clientPackages = new Set(['web', 'ui-kit', 'storage-indexeddb']);

function workspaceFolders(root) {
  return readdirSync(new URL('../' + root + '/', import.meta.url), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => root + '/' + entry.name);
}

const folders = [...workspaceFolders('apps'), ...workspaceFolders('packages')];
assert.deepEqual(
  folders.map((folder) => folder.split('/')[1]).sort(),
  Object.keys(allowed).sort(),
);

for (const folder of folders) {
  const name = folder.split('/')[1];
  const file = new URL('../' + folder + '/package.json', import.meta.url);
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(manifest.name, scope + name);
  assert.equal(manifest.private, true);

  const dependencies = {
    ...manifest.dependencies,
    ...manifest.optionalDependencies,
    ...manifest.peerDependencies,
    ...manifest.devDependencies,
  };
  for (const [dependency, range] of Object.entries(dependencies)) {
    if (dependency.startsWith(scope)) {
      assert(
        allowed[name].includes(dependency.slice(scope.length)),
        manifest.name + ' cannot depend on ' + dependency,
      );
      assert(
        range.startsWith('workspace:'),
        'Use the workspace protocol for ' + dependency,
      );
    } else if (!clientPackages.has(name)) {
      assert(
        !/^(react(?:-dom|-router(?:-dom)?)?|dexie|idb)$/.test(dependency),
        manifest.name + ' cannot depend on ' + dependency,
      );
    }
  }
}

console.log(
  'Workspace package boundaries verified for ' + folders.length + ' packages.',
);
