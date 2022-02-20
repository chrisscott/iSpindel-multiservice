import { test } from 'tap';
import build from '../src/app';

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
