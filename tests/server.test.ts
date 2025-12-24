import { test } from 'tap';
import path from 'path';
import { createServer } from '../src/server';
import getConfig from '../src/config';

test('server integration tests', async (t) => {
  // Set CONFIG_FILE_PATH to use test config
  const testConfigPath = path.join(process.cwd(), 'config.test.json');
  process.env.CONFIG_FILE_PATH = testConfigPath;

  t.test('GET / returns beer emoji', async (t) => {
    const server = await createServer({ logger: false });

    const response = await server.inject({
      method: 'GET',
      url: '/',
    });

    t.equal(response.statusCode, 200, 'returns 200');
    t.equal(response.body, '🍺', 'returns beer emoji');

    await server.close();
  });

  t.test('GET /brew (from config.test.json) returns message', async (t) => {
    const server = await createServer({ logger: false });

    const response = await server.inject({
      method: 'GET',
      url: '/brew',
    });

    t.equal(response.statusCode, 200, 'returns 200');
    t.equal(response.body, 'Data should be POSTed to this endpoint', 'returns expected message');

    await server.close();
  });

  t.test('POST /brew with valid iSpindel data returns ok', async (t) => {
    const server = await createServer({ logger: false });

    const ispindelData = {
      name: 'iSpindel001',
      ID: 12345,
      token: 'test-token',
      angle: 45.5,
      temperature: 68.2,
      temp_units: 'F',
      battery: 3.8,
      gravity: 1.050,
      interval: 900,
      RSSI: -65,
    };

    const response = await server.inject({
      method: 'POST',
      url: '/brew',
      payload: ispindelData,
    });

    t.equal(response.statusCode, 200, 'returns 200');
    t.equal(response.body, 'ok', 'returns ok');

    await server.close();
  });

  t.test('POST /brew accepts data even if fields are missing', async (t) => {
    const server = await createServer({ logger: false });

    // The schema has optional fields, so partial data is accepted
    const response = await server.inject({
      method: 'POST',
      url: '/brew',
      payload: { name: 'test' },
    });

    t.equal(response.statusCode, 200, 'returns 200 even with partial data');

    await server.close();
  });

  t.test('config.test.json is valid and loads correctly', async (t) => {
    const configPath = path.join(process.cwd(), 'config.test.json');
    const config = await getConfig(configPath);

    t.ok(config, 'config loads');
    t.equal(config.serverPath, '/brew', 'serverPath is /brew');
    t.ok(config.services, 'services array exists');
    t.equal(config.services.length, 1, 'has one service');
    t.equal(config.services[0].type, 'http', 'service type is http');
  });

  t.test('config.example.json is valid and loads correctly', async (t) => {
    const configPath = path.join(process.cwd(), 'config.example.json');
    const config = await getConfig(configPath);

    t.ok(config, 'config loads');
    t.equal(config.serverPath, '/mySpindel', 'serverPath is /mySpindel');
    t.ok(config.services, 'services array exists');
    t.ok(config.services.length > 0, 'has services configured');
  });

  // Clean up
  t.teardown(() => {
    delete process.env.CONFIG_FILE_PATH;
  });
});
