import { test } from 'tap';
import path from 'path';
import build from '../src/app';
import getConfig from '../src/config';

test('requests the "/" route', async (t) => {
  const app = build({
    config: {
      serverPath: '/',
      services: [
        {
          type: 'http',
          deviceLabel: 'foo',
          url: 'localhost',
        },
      ],
    },
  });

  const response = await (await app).inject({
    method: 'GET',
    url: '/',
  });

  t.equal(response.statusCode, 200, 'returns a status code of 200');
});

test('example config is valid', async (t) => {
  // Use process.cwd() to get project root, works from both source and compiled locations
  const configPath = path.join(process.cwd(), 'config.example.json');
  t.doesNotThrow(() => getConfig(configPath), 'does not throw an exception');
});
