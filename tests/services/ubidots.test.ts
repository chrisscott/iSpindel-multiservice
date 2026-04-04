import { test } from 'tap';
import sinon from 'sinon';
import axios from 'axios';
import { FastifyRequest } from 'fastify';
import ubidotsService from '../../src/services/ubidots';
import * as configModule from '../../src/config';
import { IspindelData } from '../../src/index.d';

test('ubidots service', async (t) => {
  let axiosPostStub: sinon.SinonStub;
  let getConfigStub: sinon.SinonStub;

  t.beforeEach(() => {
    axiosPostStub = sinon.stub(axios, 'post').resolves({ status: 200, data: 'ok' });
    getConfigStub = sinon.stub(configModule, 'default');
  });

  t.afterEach(() => {
    sinon.restore();
  });

  t.test('transforms iSpindel data to Ubidots format', async (t) => {
    const mockConfig = {
      serverPath: '/test',
      services: [
        {
          type: 'ubidots',
          deviceLabel: 'TestDevice',
          token: 'ubidots-token-123',
        },
      ],
    };
    getConfigStub.resolves(mockConfig);

    const ispindelData: IspindelData = {
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

    const mockRequest = {
      body: ispindelData,
      log: {
        info: sinon.stub(),
        error: sinon.stub(),
      },
    } as unknown as FastifyRequest;

    await ubidotsService(mockRequest);
    await new Promise((resolve) => { setTimeout(resolve, 100); });

    t.ok(axiosPostStub.called, 'axios.post was called');

    const [url, data, config] = axiosPostStub.firstCall.args;
    t.equal(url, 'https://things.ubidots.com/api/v1.6/devices/TestDevice', 'correct Ubidots URL');
    t.equal(data.tilt, 45.5, 'angle renamed to tilt');
    t.equal(data.temperature, 68.2, 'temperature passed through');
    t.equal(data.battery, 3.8, 'battery passed through');
    t.equal(data.gravity, 1.050, 'gravity passed through');
    t.equal(data.interval, 900, 'interval passed through');
    t.equal(data.RSSI, -65, 'RSSI passed through');
    t.notOk(data.angle, 'angle not in payload');
    t.equal(config.headers['X-Auth-Token'], 'ubidots-token-123', 'auth token in header');
  });

  t.test('uses deviceLabel from config or falls back to iSpindel name', async (t) => {
    const mockConfig = {
      serverPath: '/test',
      services: [
        {
          type: 'ubidots',
          token: 'ubidots-token-123',
        },
      ],
    };
    getConfigStub.resolves(mockConfig);

    const ispindelData: IspindelData = {
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

    const mockRequest = {
      body: ispindelData,
      log: {
        info: sinon.stub(),
        error: sinon.stub(),
      },
    } as unknown as FastifyRequest;

    await ubidotsService(mockRequest);
    await new Promise((resolve) => { setTimeout(resolve, 100); });

    const [url] = axiosPostStub.firstCall.args;
    t.match(url, /iSpindel001$/, 'uses iSpindel name when deviceLabel not provided');
  });

  t.test('skips service when token is missing', async (t) => {
    const mockConfig = {
      serverPath: '/test',
      services: [
        {
          type: 'ubidots',
          deviceLabel: 'TestDevice',
        },
      ],
    };
    getConfigStub.resolves(mockConfig);

    const ispindelData: IspindelData = {
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

    const mockRequest = {
      body: ispindelData,
      log: {
        info: sinon.stub(),
        error: sinon.stub(),
      },
    } as unknown as FastifyRequest;

    await ubidotsService(mockRequest);
    await new Promise((resolve) => { setTimeout(resolve, 100); });

    t.notOk(axiosPostStub.called, 'axios.post not called when token missing');
    t.ok((mockRequest.log.error as sinon.SinonStub).called, 'error logged');
  });

  t.test('skips non-ubidots services', async (t) => {
    const mockConfig = {
      serverPath: '/test',
      services: [
        {
          type: 'http',
          url: 'http://example.com',
        },
      ],
    };
    getConfigStub.resolves(mockConfig);

    const ispindelData: IspindelData = {
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

    const mockRequest = {
      body: ispindelData,
      log: {
        info: sinon.stub(),
        error: sinon.stub(),
      },
    } as unknown as FastifyRequest;

    await ubidotsService(mockRequest);
    await new Promise((resolve) => { setTimeout(resolve, 100); });

    t.notOk(axiosPostStub.called, 'axios.post not called for non-ubidots service');
  });

  t.test('handles missing request body', async (t) => {
    const mockRequest = {
      body: undefined,
      log: {
        info: sinon.stub(),
        error: sinon.stub(),
      },
    } as unknown as FastifyRequest;

    await ubidotsService(mockRequest);

    t.notOk(getConfigStub.called, 'getConfig not called when body missing');
    t.notOk(axiosPostStub.called, 'axios.post not called when body missing');
  });
});
