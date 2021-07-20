import { FastifyRequest } from 'fastify';
import axios, { AxiosRequestConfig } from 'axios';
import getConfig from '../config';
import { IspindelData } from '../index.d';

export default async (request: FastifyRequest): Promise<void> => {
  const config = await getConfig();
  if (config instanceof Error) {
    return;
  }

  const services = config.services.filter((service) => service.type === 'homeassistant');
  const data: IspindelData = request.body as IspindelData;

  const {
    temperature,
    battery,
    gravity,
    interval,
    RSSI,
  } = data;

  services.forEach(async (service) => {
    const { deviceLabel: name = data.name, url, headers = undefined } = service;
    const axiosConfig: AxiosRequestConfig = {};
    if (!url) {
      request.log.error(`'url' not set for Home Assistant service ${name}. Data not sent.`);
      return;
    }

    // payload.name = name;
    if (headers) {
      axiosConfig.headers = headers;
    }

    try {
      request.log.info(`Sending data to homeassistant at ${url} for device ${name} `);
      const payload = {
        state: temperature,
        attributes: {
          unit_of_measurement: '°F',
          friendly_name: `${name} Temp`,
        },
      };
      const { status, data: resData } = await axios.post(
        `${url}/api/states/sensor.${name}_temp`,
        payload,
        axiosConfig,
      );

      // eslint-disable-next-line no-console
      request.log.info(resData, `${status} response from ${url}`);
    } catch (err) {
      request.log.error(err.response.data, `Error from homeassistant at ${url} for device ${name}`);
    }
  });
};
