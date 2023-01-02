import fastify, { FastifyServerOptions } from 'fastify';
import getConfig, { Config } from './config';
import debug from './services/debug';
import ubidots from './services/ubidots';
import httpHook from './services/http';
import homeAssistant from './services/homeassistant';

interface AppOptions extends FastifyServerOptions {
  config?: Config;
}

export default async (opts: AppOptions) => {
  let config: Config;
  try {
    config = opts.config || await getConfig();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log(err);
    process.exit(1);
  }

  const { serverPath = '/' } = config;

  const app = fastify(opts);
  app.addHook('onResponse', debug);
  app.addHook('onResponse', ubidots);
  app.addHook('onResponse', httpHook);
  app.addHook('onResponse', homeAssistant);

  app.get(serverPath, async () => ({ status: '🍺' }));
  app.post(serverPath, opts, async () => ({ status: '🍺🍺🍺' }));

  return app;
};
