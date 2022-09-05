import { FastifyRequest } from 'fastify';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import getConfig, { Service } from '../config';
import { IspindelData } from '../index.d';
import isAxiosError from '../helpers';

export default async (request: FastifyRequest): Promise<void> => {
  const config = await getConfig();
  if (!config) {
    return;
  }

  const services = config.services.filter((service: Service) => service.type === 'http');
  const payload: IspindelData = request.body as IspindelData;

  // eslint-disable-next-line max-len
  services.forEach(async (service: Service) => {
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
    } catch (err: unknown | AxiosError) {
      if (isAxiosError(err) && err.response) {
        request.log.error(err.response.data, `http error from ${url} for device ${name}`);
      } else {
        // eslint-disable-next-line no-console
        console.log(err);
      }
    }
  });
};
