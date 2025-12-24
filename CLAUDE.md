# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

iSpindel Multiservice is a TypeScript/Node.js server that receives data from iSpindel homebrewing devices and forwards it to multiple services (Ubidots, Brewfather, Grainfather, Home Assistant, custom HTTP endpoints). It acts as a data proxy, enabling older iSpindel firmware without HTTPS support to send to modern services.

## Common Commands

### Development
```bash
pnpm install          # Install dependencies
pnpm dev              # Run in development mode with nodemon (auto-rebuilds on .ts changes)
pnpm build            # Compile TypeScript to build/ directory
pnpm start            # Build and run production server
```

### Testing
```bash
pnpm test             # Build and run all tests with tap
```

### Linting & Release
```bash
pnpm release          # Create a new release (requires .env with release-it config)
```

### Environment Variables
- `PORT` - Server port (default: 8080)
- `CONFIG_FILE_PATH` - Path to config file (default: ./config.json)
- `ISMS_DEBUG` - Enable debug logging when set

## Architecture

### Request Flow
1. iSpindel POSTs JSON data to configured `serverPath` endpoint (e.g., `/mySpindel`)
2. Fastify server receives request and validates against schema (src/server.ts:28-45)
3. Multiple Fastify `onResponse` hooks execute in parallel, each filtering for their service type
4. Each service hook reads config.json, transforms data to service-specific format, and POSTs via axios

### Core Components

**Entry Point** (src/index.ts → src/server.ts)
- Loads dotenv and starts Fastify server on IPv6 `::` (falls back to IPv4)
- Defines iSpindel data schema with properties: name, ID, token, temperature, temp_units, battery, gravity, interval, RSSI

**Configuration** (src/config.ts)
- Uses envsub to substitute `${ENV_VAR}` placeholders in config.json at runtime
- Returns parsed Config with serverPath and services array
- Supports sensitive data via environment variables (recommended for tokens/URLs)

**Service Hooks** (src/services/*.ts)
All services follow the same pattern:
1. Implemented as Fastify `onResponse` hooks that execute after response is sent
2. Filter config.services for their specific type ('http', 'ubidots', 'homeassistant')
3. Transform IspindelData to service-specific payload format
4. POST to service URL with appropriate auth headers
5. Use shared isAxiosError helper (src/helpers.ts) for error handling

**http.ts** - Generic HTTP/HTTPS POST with optional custom headers and device label override
**ubidots.ts** - Maps iSpindel fields to Ubidots format, renames 'angle' to 'tilt', uses X-Auth-Token header
**homeassistant.ts** - Creates separate sensor entities for temperature/battery/gravity/angle with state + attributes

### Key Design Decisions

**Hooks vs Routes**: Services run as Fastify `onResponse` hooks instead of route handlers, allowing the main route to return immediately while service POSTs happen asynchronously in parallel.

**Config Reloading**: Each service hook calls `getConfig()` to support dynamic config changes without restart (useful during development).

**Device Label Override**: `deviceLabel` config option allows renaming devices per service (e.g., "iSpindel SG" for Brewfather to indicate SG vs Plato).

**Error Handling**: Services log errors but don't fail the request - if one service is down, others continue forwarding data.

## Testing

The project uses tap framework with TypeScript support and sinon for mocking. Tests are organized into two categories:

### Integration Tests (tests/server.test.ts)
- Tests the full HTTP request/response cycle using `config.test.json`
- Uses `createServer()` export from src/server.ts to create testable Fastify instances
- Tests route handling (GET /, GET /brew, POST /brew)
- Validates that config files load correctly

### Unit Tests (tests/services/*.test.ts)
- Tests each service hook in isolation
- Mocks axios to avoid real HTTP requests
- Mocks getConfig to provide test configurations
- Verifies data transformations (e.g., iSpindel angle → Ubidots tilt)
- Tests error handling and missing token scenarios

**Key Testing Patterns:**
- Use `createServer({ logger: false })` for integration tests to suppress logs
- Mock axios at module level with sinon stubs
- Add 100ms delay after service calls (`await new Promise(resolve => setTimeout(resolve, 100))`) to allow async hooks to complete
- Use `server.close()` to cleanup Fastify instances after tests
- Set `CONFIG_FILE_PATH` environment variable to use test configs

## Configuration Structure

See config.example.json for reference. Each service object requires:
- `type`: 'http' | 'ubidots' | 'homeassistant'
- `url`: Target endpoint (supports ${ENV_VAR} substitution)
- `token`: API token for ubidots/homeassistant (optional for http)
- `deviceLabel`: Override iSpindel device name (optional)
- `headers`: Custom HTTP headers for http service (optional)
