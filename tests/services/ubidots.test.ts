import { test } from "tap";
import sinon from "sinon";
import { FastifyRequest } from "fastify";
import ubidotsService from "../../src/services/ubidots";
import * as configModule from "../../src/config";
import { IspindelData } from "../../src/index.d";

test("ubidots service", async (t) => {
  let fetchStub: sinon.SinonStub;
  let getConfigStub: sinon.SinonStub;

  t.beforeEach(() => {
    fetchStub = sinon.stub(globalThis, "fetch").resolves(new Response("ok", { status: 200 }));
    getConfigStub = sinon.stub(configModule, "default");
  });

  t.afterEach(() => {
    sinon.restore();
  });

  t.test("transforms iSpindel data to Ubidots format", async (t) => {
    const mockConfig = {
      serverPath: "/test",
      services: [
        {
          type: "ubidots",
          deviceLabel: "TestDevice",
          token: "ubidots-token-123",
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

    await ubidotsService(mockRequest);
    t.ok(fetchStub.called, "fetch was called");

    const [url, options] = fetchStub.firstCall.args;
    const data = JSON.parse(options.body);
    t.equal(url, "https://things.ubidots.com/api/v1.6/devices/TestDevice", "correct Ubidots URL");
    t.equal(data.tilt, 45.5, "angle renamed to tilt");
    t.equal(data.temperature, 68.2, "temperature passed through");
    t.equal(data.battery, 3.8, "battery passed through");
    t.equal(data.gravity, 1.05, "gravity passed through");
    t.equal(data.interval, 900, "interval passed through");
    t.equal(data.RSSI, -65, "RSSI passed through");
    t.notOk(data.angle, "angle not in payload");
    t.equal(options.headers["X-Auth-Token"], "ubidots-token-123", "auth token in header");
  });

  t.test("uses deviceLabel from config or falls back to iSpindel name", async (t) => {
    const mockConfig = {
      serverPath: "/test",
      services: [
        {
          type: "ubidots",
          token: "ubidots-token-123",
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

    await ubidotsService(mockRequest);
    const [url] = fetchStub.firstCall.args;
    t.match(url, /iSpindel001$/, "uses iSpindel name when deviceLabel not provided");
  });

  t.test("skips service when token is missing", async (t) => {
    const mockConfig = {
      serverPath: "/test",
      services: [
        {
          type: "ubidots",
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

    await ubidotsService(mockRequest);
    t.notOk(fetchStub.called, "fetch not called when token missing");
    t.ok((mockRequest.log.error as sinon.SinonStub).called, "error logged");
  });

  t.test("skips non-ubidots services", async (t) => {
    const mockConfig = {
      serverPath: "/test",
      services: [
        {
          type: "http",
          url: "http://example.com",
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

    await ubidotsService(mockRequest);
    t.notOk(fetchStub.called, "fetch not called for non-ubidots service");
  });

  t.test("handles missing request body", async (t) => {
    const mockRequest = {
      body: undefined,
      log: {
        info: sinon.stub(),
        error: sinon.stub(),
      },
    } as unknown as FastifyRequest;

    await ubidotsService(mockRequest);

    t.notOk(getConfigStub.called, "getConfig not called when body missing");
    t.notOk(fetchStub.called, "fetch not called when body missing");
  });

  t.test("logs error on HTTP error response", async (t) => {
    fetchStub.resolves(new Response("Unauthorized", { status: 401 }));
    const mockConfig = {
      serverPath: "/test",
      services: [
        {
          type: "ubidots",
          deviceLabel: "TestDevice",
          token: "bad-token",
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

    await ubidotsService(mockRequest);
    const errorStub = mockRequest.log.error as sinon.SinonStub;
    t.ok(errorStub.called, "error logged on non-ok response");
    t.match(errorStub.firstCall.args[1], /Ubidots error/, "logs Ubidots error message");
  });

  t.test("logs error on network failure", async (t) => {
    fetchStub.rejects(new TypeError("fetch failed"));
    const mockConfig = {
      serverPath: "/test",
      services: [
        {
          type: "ubidots",
          deviceLabel: "TestDevice",
          token: "ubidots-token-123",
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

    await ubidotsService(mockRequest);
    const errorStub = mockRequest.log.error as sinon.SinonStub;
    t.ok(errorStub.called, "error logged on network failure");
    t.match(errorStub.firstCall.args[1], /Unexpected error/, "logs unexpected error message");
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

    await ubidotsService(mockRequest);
    t.notOk(fetchStub.called, "fetch not called when config fails");
    const errorStub = mockRequest.log.error as sinon.SinonStub;
    t.ok(errorStub.called, "error logged when config fails to load");
    t.match(errorStub.firstCall.args[1], /Failed to load config/, "logs config load failure message");
  });
});
