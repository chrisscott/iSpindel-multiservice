import { FastifyRequest } from 'fastify';
import axios from 'axios';
import { ServiceType } from '../config';
import getServices from '../getServices';
import { IspindelData } from '../index.d';

interface UbiDotsData {
  tilt: number;
  temperature: number;
  battery: number;
  gravity: number;
  interval: number;
  RSSI: number;
}

export default async (request: FastifyRequest): Promise<void> => {
  const services = await getServices(request, ServiceType.Ubidots);
  if (!services) {
    return;
  }

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

  services.forEach(async (service) => {
    const { deviceLabel: name = data.name, token } = service;

    if (!token) {
      request.log.error(`Ubidots service for ${name} does not have a token in config.json or env. Skipping service.`);
      return;
    }

    try {
      request.log.info(`Sending data to Ubidots for device ${name}`);
      await axios.post(
        `https://things.ubidots.com/api/v1.6/devices/${name}`,
        payload,
        {
          headers: { 'X-Auth-Token': token },
        },
      );
    } catch (err) {
      request.log.error(err, `Ubidots error for device ${name}`);
    }
  });
};
