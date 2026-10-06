import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getConfig } from '@/config';
import { estimate } from '@/domain/estimate';
import { VECTORS } from '../vectors';

const dir = path.resolve(__dirname, '../../contract/fixtures/pricing');

describe('golden vectors are in sync with the domain', () => {
  for (const name of Object.keys(VECTORS)) {
    it(name, () => {
      const file = JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), 'utf8'));
      expect(estimate(file.input, getConfig())).toEqual(file.expected);
    });
  }
});
