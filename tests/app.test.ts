import { test } from 'tap';
import build from '../src/app';
import getConfig from '../src/config';

test('requests the "/" route', async (t) => {
  const app = build({
    config: {
      serverPath: '/',
    },
  });

  const response = await (await app).inject({
    method: 'GET',
    url: '/',
  });

  t.equal(response.statusCode, 200, 'returns a status code of 200');
});

test('example config is valid', async (t) => {
  t.doesNotThrow(() => getConfig(`${__dirname}/../config.example.json`), 'does not throw an exception');
});
