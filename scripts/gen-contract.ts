/**
 * One command builds the whole contract from the Zod schemas (decisions D22):
 *   pnpm contract:gen  → contract/openapi.yaml + contract/jsonschema/*.schema.json
 *   pnpm contract:check → same, but fails if the committed files differ (used in CI)
 */
import fs from 'node:fs';
import path from 'node:path';
import * as z from 'zod';
import { createDocument } from 'zod-openapi';
import YAML from 'yaml';
import { OrderInput } from '../src/contract/order';
import { Estimate } from '../src/contract/estimate';
import { AddressRecord, OrderRequest, Problem, Slot, SubmitResult } from '../src/contract/api';
import { AppConfig, CatalogConfig, ElevatorsConfig, PricingConfig, TimeConfig, VehiclesConfig, ZonesConfig } from '../src/config/schema';
import { RulesConfig } from '../src/domain/rules/engine';
import { StepsConfig } from '../src/domain/flow/steps';

const root = path.resolve(import.meta.dirname, '..');
const check = process.argv.includes('--check');

const problem = (description: string) => ({ description, content: { 'application/problem+json': { schema: Problem } } });

const doc = createDocument({
  openapi: '3.1.0',
  info: {
    title: 'Mutabil moving configurator API',
    version: '0.1.0',
    description: 'Generated from Zod schemas in src/contract. Do not edit by hand: run `pnpm contract:gen`.',
    license: { name: 'Proprietary' },
  },
  components: {
    securitySchemes: {
      staff: { type: 'http', scheme: 'bearer', description: 'Staff token (crew, estimators). Not used by the public configurator.' },
    },
  },
  servers: [{ url: '/api' }],
  paths: {
    '/v1/estimates': {
      post: {
        operationId: 'createEstimate',
        security: [],
        summary: 'Recompute an estimate on the server (the server is the only authority on price)',
        requestBody: { required: true, content: { 'application/json': { schema: OrderInput } } },
        responses: {
          '200': { description: 'Estimate', content: { 'application/json': { schema: Estimate } } },
          '422': problem('Validation error'),
          '501': problem('Not implemented yet (MVP: the Go pricing service is a stub; see docs/decisions.md D23)'),
        },
      },
    },
    '/v1/orders': {
      post: {
        operationId: 'submitOrder',
        security: [],
        summary: 'Send a moving request (no obligation). Price is recomputed server-side.',
        requestBody: { required: true, content: { 'application/json': { schema: OrderRequest } } },
        responses: {
          '201': { description: 'Received', content: { 'application/json': { schema: SubmitResult } } },
          '422': problem('Validation error'),
          '501': problem('Not implemented yet (MVP: orders are handled by the front-end mock service)'),
        },
      },
    },
    '/v1/slots': {
      get: {
        operationId: 'listSlots',
        security: [],
        summary: 'Available start slots for a guaranteed window length',
        requestParams: { query: z.object({ from: z.iso.date(), to: z.iso.date(), windowH: z.string().regex(/^\d+$/) }) },
        responses: {
          '200': { description: 'Slots', content: { 'application/json': { schema: z.array(Slot) } } },
          '422': problem('Validation error'),
        },
      },
    },
    '/v1/address-directory/{key}': {
      get: {
        operationId: 'getAddressRecord',
        security: [],
        summary: 'Building facts for an address key (elevator class, rules), so the next client does not have to answer',
        requestParams: { path: z.object({ key: z.string() }) },
        responses: {
          '200': { description: 'Known building', content: { 'application/json': { schema: AddressRecord } } },
          '404': problem('Unknown address'),
        },
      },
      put: {
        operationId: 'putAddressRecord',
        security: [{ staff: [] }],
        summary: 'Save building facts after a survey or a move',
        requestParams: { path: z.object({ key: z.string() }) },
        requestBody: { required: true, content: { 'application/json': { schema: AddressRecord } } },
        responses: { '204': { description: 'Saved' }, '401': problem('Staff token required'), '422': problem('Validation error') },
      },
    },
  },
});

function sortKeys(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(sortKeys);
  if (x && typeof x === 'object')
    return Object.fromEntries(
      Object.keys(x)
        .sort()
        .map((k) => [k, sortKeys((x as Record<string, unknown>)[k])]),
    );
  return x;
}

/**
 * oapi-codegen 2.8 has only initial OpenAPI 3.1 support: a multi-type `type: [a, b]` (without
 * "null") is not handled, so it is rewritten as the equivalent `anyOf`.
 */
function goCompatible(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(goCompatible);
  if (x && typeof x === 'object') {
    const o = Object.fromEntries(Object.entries(x).map(([k, v]) => [k, goCompatible(v)])) as Record<string, unknown>;
    if (Array.isArray(o.type) && !o.type.includes('null')) {
      const types = o.type as string[];
      delete o.type;
      o.anyOf = types.map((type) => (type === 'number' ? { type, format: 'double' } : { type }));
    }
    // oapi-codegen maps a format-less number to float32; prices/volumes need float64
    if (o.type === 'number' && o.format === undefined) o.format = 'double';
    return o;
  }
  return x;
}

const outputs: Record<string, string> = {
  'contract/openapi.yaml': YAML.stringify(sortKeys(goCompatible(doc)), { lineWidth: 0, version: '1.1' }),
};
const configSchemas = {
  pricing: PricingConfig,
  time: TimeConfig,
  elevators: ElevatorsConfig,
  vehicles: VehiclesConfig,
  catalog: CatalogConfig,
  zones: ZonesConfig,
  app: AppConfig,
  rules: RulesConfig,
  steps: StepsConfig,
};
for (const [name, schema] of Object.entries(configSchemas)) {
  const js = z.toJSONSchema(schema, { target: 'draft-2020-12', unrepresentable: 'any' });
  outputs[`contract/jsonschema/${name}.config.schema.json`] =
    JSON.stringify(sortKeys({ ...js, title: `${name} config (after unwrap)` }), null, 2) + '\n';
}

let dirty = 0;
for (const [rel, content] of Object.entries(outputs)) {
  const file = path.join(root, rel);
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (current === content) continue;
  if (check) {
    console.error(`✗ ${rel} is out of date — run pnpm contract:gen and commit`);
    dirty++;
  } else {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    console.log(`✓ wrote ${rel}`);
  }
}
if (dirty) process.exit(1);
if (check) console.log('✓ contract is up to date');
