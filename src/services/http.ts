import { FastifyRequest } from 'fastify';
import axios, { AxiosRequestConfig } from 'axios';
import getServices from '../getServices';
import { IspindelData } from '../index.d';
import { ServiceType } from '../config';

export default async (request: FastifyRequest): Promise<void> => {
  const services = await getServices(request, ServiceType.HTTP);
  if (!services) {
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
