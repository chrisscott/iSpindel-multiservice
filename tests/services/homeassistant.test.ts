import { test } from 'tap';
import sinon from 'sinon';
import axios from 'axios';
import { FastifyRequest } from 'fastify';
import homeAssistantService from '../../src/services/homeassistant';
import * as configModule from '../../src/config';
import { IspindelData } from '../../src/index.d';

test('homeassistant service', async (t) => {
  let axiosPostStub: sinon.SinonStub;
  let getConfigStub: sinon.SinonStub;

  t.beforeEach(() => {
    axiosPostStub = sinon.stub(axios, 'post').resolves({ status: 200, data: 'ok' });
    getConfigStub = sinon.stub(configModule, 'default');
  });

  t.afterEach(() => {
    sinon.restore();
  });

  t.test('creates separate sensor entities for each metric', async (t) => {
    const mockConfig = {
      serverPath: '/test',
      services: [
        {
          type: 'homeassistant',
          url: 'http://homeassistant.local:8123',
          token: 'ha-token-123',
          deviceLabel: 'iSpindel',
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

    await homeAssistantService(mockRequest);
    await new Promise((resolve) => { setTimeout(resolve, 100); });

    t.equal(axiosPostStub.callCount, 4, 'creates 4 sensor entities');

    // Check temperature sensor
    const tempCall = axiosPostStub.getCalls().find((call) => call.args[0].includes('temperature'));
    t.ok(tempCall, 'temperature sensor created');
    if (tempCall) {
      t.equal(tempCall.args[0], 'http://homeassistant.local:8123/api/states/sensor.iSpindel_temperature');
      t.equal(tempCall.args[1].state, 68.2);
      t.equal(tempCall.args[1].attributes.unit_of_measurement, '°F');
      t.equal(tempCall.args[1].attributes.friendly_name, 'iSpindel temperature');
    }

    // Check battery sensor
    const batteryCall = axiosPostStub.getCalls().find((call) => call.args[0].includes('battery'));
    t.ok(batteryCall, 'battery sensor created');
    if (batteryCall) {
      t.equal(batteryCall.args[1].state, 3.8);
      t.equal(batteryCall.args[1].attributes.unit_of_measurement, 'Volts');
    }

    // Check gravity sensor
    const gravityCall = axiosPostStub.getCalls().find((call) => call.args[0].includes('gravity'));
    t.ok(gravityCall, 'gravity sensor created');
    if (gravityCall) {
      t.equal(gravityCall.args[1].state, 1.050);
      t.equal(gravityCall.args[1].attributes.unit_of_measurement, 'SG');
    }

    // Check angle sensor
    const angleCall = axiosPostStub.getCalls().find((call) => call.args[0].includes('angle'));
    t.ok(angleCall, 'angle sensor created');
    if (angleCall) {
      t.equal(angleCall.args[1].state, 45.5);
      t.equal(angleCall.args[1].attributes.unit_of_measurement, 'Degrees');
    }
  });

  t.test('includes Bearer token in Authorization header', async (t) => {
    const mockConfig = {
      serverPath: '/test',
      services: [
        {
          type: 'homeassistant',
          url: 'http://homeassistant.local:8123',
          token: 'ha-token-123',
          deviceLabel: 'iSpindel',
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

    await homeAssistantService(mockRequest);
    await new Promise((resolve) => { setTimeout(resolve, 100); });

    axiosPostStub.getCalls().forEach((call) => {
      const config = call.args[2];
      t.equal(config.headers.Authorization, 'Bearer ha-token-123', 'includes Bearer token');
    });
  });

  t.test('uses deviceLabel from config or falls back to iSpindel name', async (t) => {
    const mockConfig = {
      serverPath: '/test',
      services: [
        {
          type: 'homeassistant',
          url: 'http://homeassistant.local:8123',
          token: 'ha-token-123',
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

    await homeAssistantService(mockRequest);
    await new Promise((resolve) => { setTimeout(resolve, 100); });

    const firstCall = axiosPostStub.firstCall.args[0];
    t.match(firstCall, /sensor\.iSpindel001_/, 'uses iSpindel name when deviceLabel not provided');
  });

  t.test('logs error when URL not configured', async (t) => {
    const mockConfig = {
      serverPath: '/test',
      services: [
        {
          type: 'homeassistant',
          token: 'ha-token-123',
          deviceLabel: 'iSpindel',
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

    await homeAssistantService(mockRequest);
    await new Promise((resolve) => { setTimeout(resolve, 100); });

    t.notOk(axiosPostStub.called, 'axios.post not called when URL missing');
    t.ok((mockRequest.log.error as sinon.SinonStub).called, 'error logged');
  });

  t.test('skips non-homeassistant services', async (t) => {
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

    await homeAssistantService(mockRequest);
    await new Promise((resolve) => { setTimeout(resolve, 100); });

    t.notOk(axiosPostStub.called, 'axios.post not called for non-homeassistant service');
  });

  t.test('handles missing request body', async (t) => {
    const mockRequest = {
      body: undefined,
      log: {
        info: sinon.stub(),
        error: sinon.stub(),
      },
    } as unknown as FastifyRequest;

    await homeAssistantService(mockRequest);

    t.notOk(getConfigStub.called, 'getConfig not called when body missing');
    t.notOk(axiosPostStub.called, 'axios.post not called when body missing');
  });
});
