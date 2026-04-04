import { test } from 'tap';
import sinon from 'sinon';
import axios from 'axios';
import { FastifyRequest } from 'fastify';
import httpService from '../../src/services/http';
import * as configModule from '../../src/config';
import { IspindelData } from '../../src/index.d';

test('http service', async (t) => {
  let axiosPostStub: sinon.SinonStub;
  let getConfigStub: sinon.SinonStub;

  t.beforeEach(() => {
    axiosPostStub = sinon.stub(axios, 'post').resolves({ status: 200, data: 'ok' });
    getConfigStub = sinon.stub(configModule, 'default');
  });

  t.afterEach(() => {
    sinon.restore();
  });

  t.test('sends data to configured http service', async (t) => {
    const mockConfig = {
      serverPath: '/test',
      services: [
        {
          type: 'http',
          url: 'http://example.com/endpoint',
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

    await httpService(mockRequest);

    // Give async operations time to complete
    await new Promise((resolve) => { setTimeout(resolve, 100); });

    t.ok(axiosPostStub.called, 'axios.post was called');
    t.equal(axiosPostStub.callCount, 1, 'axios.post called once');

    const [url, data] = axiosPostStub.firstCall.args;
    t.equal(url, 'http://example.com/endpoint', 'correct URL');
    t.equal(data.name, 'TestDevice', 'deviceLabel overrides name');
    t.equal(data.temperature, 68.2, 'temperature passed through');
  });

  t.test('sends custom headers when configured', async (t) => {
    const mockConfig = {
      serverPath: '/test',
      services: [
        {
          type: 'http',
          url: 'http://example.com/endpoint',
          headers: {
            'X-Custom-Header': 'CustomValue',
            'Authorization': 'Bearer token123',
          },
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

    await httpService(mockRequest);
    await new Promise((resolve) => { setTimeout(resolve, 100); });

    const [, , config] = axiosPostStub.firstCall.args;
    t.ok(config.headers, 'headers included in request');
    t.equal(config.headers['X-Custom-Header'], 'CustomValue', 'custom header sent');
    t.equal(config.headers['Authorization'], 'Bearer token123', 'auth header sent');
  });

  t.test('skips non-http services', async (t) => {
    const mockConfig = {
      serverPath: '/test',
      services: [
        {
          type: 'ubidots',
          url: 'http://ubidots.com',
          token: 'token',
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

    await httpService(mockRequest);
    await new Promise((resolve) => { setTimeout(resolve, 100); });

    t.notOk(axiosPostStub.called, 'axios.post not called for non-http service');
  });

  t.test('handles missing request body', async (t) => {
    const mockRequest = {
      body: undefined,
      log: {
        info: sinon.stub(),
        error: sinon.stub(),
      },
    } as unknown as FastifyRequest;

    await httpService(mockRequest);

    t.notOk(getConfigStub.called, 'getConfig not called when body missing');
    t.notOk(axiosPostStub.called, 'axios.post not called when body missing');
  });
});
