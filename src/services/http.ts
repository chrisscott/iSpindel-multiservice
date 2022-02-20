import { FastifyRequest } from 'fastify';
import axios, { AxiosRequestConfig } from 'axios';
import getConfig from '../config';
import { IspindelData } from '../index.d';

export default async (request: FastifyRequest): Promise<void> => {
  if (request.is404 || request.method === 'GET') {
    return;
  }

  const config = await getConfig();
  if (config instanceof Error  || !config.services) {
    return;
  }

  const services = config.services.filter((service) => service.type === 'http');
  if (services.length === 0) {
    return;
  }

  const payload: IspindelData = request.body as IspindelData;

  services.forEach(async (service) => {
    const { deviceLabel: name = payload.name, url, headers = undefined } = service;
    const axiosConfig: AxiosRequestConfig = {};
    if (!url) {
      request.log.error(`'url' not set for http service ${name}. Data not sent.`);
      return;
    }

    payload.name = name;
    if (headers) {
      axiosConfig.headers = headers;
    }

    try {
      request.log.info(`Sending data to ${url} for device ${name} `);
      const { status, data: resData } = await axios.post(
        url,
        payload,
        axiosConfig,
      );
      // eslint-disable-next-line no-console
      request.log.info(resData, `${status} response from ${url}`);
    } catch (err) {
      request.log.error(err, `http error from ${url} for device ${name}`);
    }
  });
};
