import { test } from "tap";
import sinon from "sinon";
import { FastifyRequest } from "fastify";
import homeAssistantService from "../../src/services/homeassistant";
import * as configModule from "../../src/config";
import { IspindelData } from "../../src/index.d";

test("homeassistant service", async (t) => {
  let fetchStub: sinon.SinonStub;
  let getConfigStub: sinon.SinonStub;

  t.beforeEach(() => {
    fetchStub = sinon.stub(globalThis, "fetch").resolves(new Response("ok", { status: 200 }));
    getConfigStub = sinon.stub(configModule, "default");
  });

  t.afterEach(() => {
    sinon.restore();
  });

  t.test("creates separate sensor entities for each metric", async (t) => {
    const mockConfig = {
      serverPath: "/test",
      services: [
        {
          type: "homeassistant",
          url: "http://homeassistant.local:8123",
          token: "ha-token-123",
          deviceLabel: "iSpindel",
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

    await homeAssistantService(mockRequest);
    t.equal(fetchStub.callCount, 4, "creates 4 sensor entities");

    // Check temperature sensor
    const tempCall = fetchStub.getCalls().find((call) => call.args[0].includes("temperature"));
    t.ok(tempCall, "temperature sensor created");
    if (tempCall) {
      t.equal(
        tempCall.args[0],
        "http://homeassistant.local:8123/api/states/sensor.iSpindel_temperature",
      );
      const body = JSON.parse(tempCall.args[1].body);
      t.equal(body.state, 68.2);
      t.equal(body.attributes.unit_of_measurement, "°F");
      t.equal(body.attributes.friendly_name, "iSpindel temperature");
    }

    // Check battery sensor
    const batteryCall = fetchStub.getCalls().find((call) => call.args[0].includes("battery"));
    t.ok(batteryCall, "battery sensor created");
    if (batteryCall) {
      const body = JSON.parse(batteryCall.args[1].body);
      t.equal(body.state, 3.8);
      t.equal(body.attributes.unit_of_measurement, "Volts");
    }

    // Check gravity sensor
    const gravityCall = fetchStub.getCalls().find((call) => call.args[0].includes("gravity"));
    t.ok(gravityCall, "gravity sensor created");
    if (gravityCall) {
      const body = JSON.parse(gravityCall.args[1].body);
      t.equal(body.state, 1.05);
      t.equal(body.attributes.unit_of_measurement, "SG");
    }

    // Check angle sensor
    const angleCall = fetchStub.getCalls().find((call) => call.args[0].includes("angle"));
    t.ok(angleCall, "angle sensor created");
    if (angleCall) {
      const body = JSON.parse(angleCall.args[1].body);
      t.equal(body.state, 45.5);
      t.equal(body.attributes.unit_of_measurement, "Degrees");
    }
  });

  t.test("includes Bearer token in Authorization header", async (t) => {
    const mockConfig = {
      serverPath: "/test",
      services: [
        {
          type: "homeassistant",
          url: "http://homeassistant.local:8123",
          token: "ha-token-123",
          deviceLabel: "iSpindel",
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

    await homeAssistantService(mockRequest);
    fetchStub.getCalls().forEach((call) => {
      const options = call.args[1];
      t.equal(options.headers.Authorization, "Bearer ha-token-123", "includes Bearer token");
    });
  });

  t.test("uses deviceLabel from config or falls back to iSpindel name", async (t) => {
    const mockConfig = {
      serverPath: "/test",
      services: [
        {
          type: "homeassistant",
          url: "http://homeassistant.local:8123",
          token: "ha-token-123",
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

    await homeAssistantService(mockRequest);
    const firstCall = fetchStub.firstCall.args[0];
    t.match(firstCall, /sensor\.iSpindel001_/, "uses iSpindel name when deviceLabel not provided");
  });

  t.test("logs error when URL not configured", async (t) => {
    const mockConfig = {
      serverPath: "/test",
      services: [
        {
          type: "homeassistant",
          token: "ha-token-123",
          deviceLabel: "iSpindel",
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

    await homeAssistantService(mockRequest);
    t.notOk(fetchStub.called, "fetch not called when URL missing");
    t.ok((mockRequest.log.error as sinon.SinonStub).called, "error logged");
  });

  t.test("skips non-homeassistant services", async (t) => {
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

    await homeAssistantService(mockRequest);
    t.notOk(fetchStub.called, "fetch not called for non-homeassistant service");
  });

  t.test("handles missing request body", async (t) => {
    const mockRequest = {
      body: undefined,
      log: {
        info: sinon.stub(),
        error: sinon.stub(),
      },
    } as unknown as FastifyRequest;

    await homeAssistantService(mockRequest);

    t.notOk(getConfigStub.called, "getConfig not called when body missing");
    t.notOk(fetchStub.called, "fetch not called when body missing");
  });

  t.test("logs error on HTTP error response", async (t) => {
    fetchStub.callsFake(() => Promise.resolve(new Response("Unauthorized", { status: 401 })));
    const mockConfig = {
      serverPath: "/test",
      services: [
        {
          type: "homeassistant",
          url: "http://homeassistant.local:8123",
          token: "bad-token",
          deviceLabel: "iSpindel",
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

    await homeAssistantService(mockRequest);
    const errorStub = mockRequest.log.error as sinon.SinonStub;
    t.ok(errorStub.called, "error logged on non-ok response");
    t.match(
      errorStub.firstCall.args[1],
      /Error from homeassistant/,
      "logs homeassistant error message",
    );
  });

  t.test("logs error on network failure", async (t) => {
    fetchStub.rejects(new TypeError("fetch failed"));
    const mockConfig = {
      serverPath: "/test",
      services: [
        {
          type: "homeassistant",
          url: "http://homeassistant.local:8123",
          token: "ha-token-123",
          deviceLabel: "iSpindel",
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

    await homeAssistantService(mockRequest);
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

    await homeAssistantService(mockRequest);
    t.notOk(fetchStub.called, "fetch not called when config fails");
    const errorStub = mockRequest.log.error as sinon.SinonStub;
    t.ok(errorStub.called, "error logged when config fails to load");
    t.match(errorStub.firstCall.args[1], /Failed to load config/, "logs config load failure message");
  });
});
