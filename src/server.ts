import app from './app';

export default async (): Promise<void> => {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

  const opts = {
    logger: { level: process.env.ISMS_DEBUG ? 'debug' : 'info' },
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

  const server = await app(opts);

  server.listen(port, '0.0.0.0', (err) => {
    if (err) {
      server.log.error(err);
      process.exit(1);
    }
  });
};
