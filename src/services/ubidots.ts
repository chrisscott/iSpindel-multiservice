import { FastifyRequest } from 'fastify';
import getConfig, { Service } from '../config';
import { IspindelData } from '../index.d';
import { FetchError, isFetchError } from '../helpers';

interface UbiDotsData {
  tilt: number;
  temperature: number;
  battery: number;
  gravity: number;
  interval: number;
  RSSI: number;
}

export default async (request: FastifyRequest): Promise<void> => {
  if (!request.body) {
    return;
  }

  let config;

  try {
    config = await getConfig();
  } catch (err) {
    return;
  }

  const services = config.services.filter((service: Service) => service.type === 'ubidots');
  const data: IspindelData = request.body as IspindelData;

  const {
    temperature,
    battery,
    gravity,
    interval,
    RSSI,
  } = data;

  const payload: UbiDotsData = {
    tilt: data.angle,
    temperature,
    battery,
    gravity,
    interval,
    RSSI,
  };

  services.forEach(async (service: Service) => {
    const { deviceLabel: name = data.name, token } = service;

    if (!token) {
      request.log.error(`Ubidots service for ${name} does not have a token in config.json or env. Skipping service.`);
      return;
    }

    try {
      request.log.info(`Sending data to Ubidots for device ${name}`);
      const response = await fetch(
        `https://things.ubidots.com/api/v1.6/devices/${name}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': token,
          },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const resData = await response.text();
        throw new FetchError(response.status, resData);
      }
    } catch (err: unknown) {
      if (isFetchError(err)) {
        request.log.error(err.responseData, `Ubidots error for device ${name}`);
      } else {
        request.log.error(err, `Unexpected error sending data to Ubidots for device ${name}`);
      }
    }
  });
};
