import { FastifyInstance } from 'fastify';
import fastify from 'fastify';
import getConfig from './config';
import debug from './services/debug';
import ubidots from './services/ubidots';
import httpHook from './services/http';
import homeAssistant from './services/homeassistant';

export interface ServerOptions {
  logger?: boolean | object;
}

/**
 * Creates and configures the Fastify server instance
 */
export async function createServer(opts: ServerOptions = {}): Promise<FastifyInstance> {
  const config = await getConfig();
  if (!config?.serverPath) {
    throw new Error('Error parsing config. Check for syntax errors. Missing serverPath.');
  }

  const { serverPath } = config;

  const loggerConfig = opts.logger !== undefined
    ? opts.logger
    : { level: process.env.ISMS_DEBUG ? 'debug' : 'info' };

  const server = fastify({
    logger: loggerConfig,
  });

  server.addHook('onResponse', debug);
  server.addHook('onResponse', ubidots);
  server.addHook('onResponse', httpHook);
  server.addHook('onResponse', homeAssistant);

  const routeOpts = {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          ID: { type: 'number' },
          token: { type: 'string' },
          temperature: { type: 'number' },
          temp_units: { type: 'string' },
          battery: { type: 'number' },
          gravity: { type: 'number' },
          interval: { type: 'number' },
          RSSI: { type: 'number' },
        },
      },
    },
  };

  server.get('/', async () => '🍺');
  server.get(serverPath, async () => 'Data should be POSTed to this endpoint');
  server.post(serverPath, routeOpts, async () => 'ok');

  return server;
}

/**
 * Starts the server and listens on the configured port
 */
export default async (): Promise<void> => {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
  const server = await createServer();

  server.listen({ port, host: '::' }, (err) => {
    if (err) {
      server.log.error(err);
      process.exit(1);
    }
  });
};
