import { test } from "tap";
import sinon from "sinon";
import { FastifyRequest } from "fastify";
import httpService from "../../src/services/http";
import * as configModule from "../../src/config";
import { IspindelData } from "../../src/index.d";

test("http service", async (t) => {
  let fetchStub: sinon.SinonStub;
  let getConfigStub: sinon.SinonStub;

  t.beforeEach(() => {
    fetchStub = sinon.stub(globalThis, "fetch").resolves(new Response("ok", { status: 200 }));
    getConfigStub = sinon.stub(configModule, "default");
  });

  t.afterEach(() => {
    sinon.restore();
  });

  t.test("sends data to configured http service", async (t) => {
    const mockConfig = {
      serverPath: "/test",
      services: [
        {
          type: "http",
          url: "http://example.com/endpoint",
          deviceLabel: "TestDevice",
        },
      ],
    };
    getConfigStub.resolves(mockConfig);

    const ispindelData: IspindelData = {
      name: "iSpindel001",
      ID: 12345,
      token: "test-token",
      angle: 45.5,
      temperature: 68.2,
      temp_units: "F",
      battery: 3.8,
      gravity: 1.05,
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
    t.ok(fetchStub.called, "fetch was called");
    t.equal(fetchStub.callCount, 1, "fetch called once");

    const [url, options] = fetchStub.firstCall.args;
    t.equal(url, "http://example.com/endpoint", "correct URL");
    const body = JSON.parse(options.body);
    t.equal(body.name, "TestDevice", "deviceLabel overrides name");
    t.equal(body.temperature, 68.2, "temperature passed through");
  });

  t.test("sends custom headers when configured", async (t) => {
    const mockConfig = {
      serverPath: "/test",
      services: [
        {
          type: "http",
          url: "http://example.com/endpoint",
          headers: {
            "X-Custom-Header": "CustomValue",
            Authorization: "Bearer token123",
          },
        },
      ],
    };
    getConfigStub.resolves(mockConfig);

    const ispindelData: IspindelData = {
      name: "iSpindel001",
      ID: 12345,
      token: "test-token",
      angle: 45.5,
      temperature: 68.2,
      temp_units: "F",
      battery: 3.8,
      gravity: 1.05,
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
    const [, options] = fetchStub.firstCall.args;
    t.ok(options.headers, "headers included in request");
    t.equal(options.headers["X-Custom-Header"], "CustomValue", "custom header sent");
    t.equal(options.headers["Authorization"], "Bearer token123", "auth header sent");
  });

  t.test("skips non-http services", async (t) => {
    const mockConfig = {
      serverPath: "/test",
      services: [
        {
          type: "ubidots",
          url: "http://ubidots.com",
          token: "token",
        },
      ],
    };
    getConfigStub.resolves(mockConfig);

    const ispindelData: IspindelData = {
      name: "iSpindel001",
      ID: 12345,
      token: "test-token",
      angle: 45.5,
      temperature: 68.2,
      temp_units: "F",
      battery: 3.8,
      gravity: 1.05,
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
    t.notOk(fetchStub.called, "fetch not called for non-http service");
  });

  t.test("handles missing request body", async (t) => {
    const mockRequest = {
      body: undefined,
      log: {
        info: sinon.stub(),
        error: sinon.stub(),
      },
    } as unknown as FastifyRequest;

    await httpService(mockRequest);

    t.notOk(getConfigStub.called, "getConfig not called when body missing");
    t.notOk(fetchStub.called, "fetch not called when body missing");
  });

  t.test("logs error on HTTP error response", async (t) => {
    fetchStub.resolves(new Response("Not Found", { status: 404 }));
    const mockConfig = {
      serverPath: "/test",
      services: [
        {
          type: "http",
          url: "http://example.com/endpoint",
        },
      ],
    };
    getConfigStub.resolves(mockConfig);

    const ispindelData: IspindelData = {
      name: "iSpindel001",
      ID: 12345,
      token: "test-token",
      angle: 45.5,
      temperature: 68.2,
      temp_units: "F",
      battery: 3.8,
      gravity: 1.05,
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
    const errorStub = mockRequest.log.error as sinon.SinonStub;
    t.ok(errorStub.called, "error logged on non-ok response");
    t.match(errorStub.firstCall.args[1], /http error from/, "logs http error message");
  });

  t.test("logs error on network failure", async (t) => {
    fetchStub.rejects(new TypeError("fetch failed"));
    const mockConfig = {
      serverPath: "/test",
      services: [
        {
          type: "http",
          url: "http://example.com/endpoint",
        },
      ],
    };
    getConfigStub.resolves(mockConfig);

    const ispindelData: IspindelData = {
      name: "iSpindel001",
      ID: 12345,
      token: "test-token",
      angle: 45.5,
      temperature: 68.2,
      temp_units: "F",
      battery: 3.8,
      gravity: 1.05,
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
    const errorStub = mockRequest.log.error as sinon.SinonStub;
    t.ok(errorStub.called, "error logged on network failure");
    t.match(errorStub.firstCall.args[1], /Unexpected error/, "logs unexpected error message");
  });

  t.test("logs error when URL not configured", async (t) => {
    const mockConfig = {
      serverPath: "/test",
      services: [
        {
          type: "http",
        },
      ],
    };
    getConfigStub.resolves(mockConfig);

    const ispindelData: IspindelData = {
      name: "iSpindel001",
      ID: 12345,
      token: "test-token",
      angle: 45.5,
      temperature: 68.2,
      temp_units: "F",
      battery: 3.8,
      gravity: 1.05,
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
    t.notOk(fetchStub.called, "fetch not called when URL missing");
    t.ok((mockRequest.log.error as sinon.SinonStub).called, "error logged");
  });

  t.test("handles config load failure", async (t) => {
    getConfigStub.rejects(new Error("config error"));

    const ispindelData: IspindelData = {
      name: "iSpindel001",
      ID: 12345,
      token: "test-token",
      angle: 45.5,
      temperature: 68.2,
      temp_units: "F",
      battery: 3.8,
      gravity: 1.05,
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
    t.notOk(fetchStub.called, "fetch not called when config fails");
    const errorStub = mockRequest.log.error as sinon.SinonStub;
    t.ok(errorStub.called, "error logged when config fails to load");
    t.match(
      errorStub.firstCall.args[1],
      /Failed to load config/,
      "logs config load failure message",
    );
  });
});
