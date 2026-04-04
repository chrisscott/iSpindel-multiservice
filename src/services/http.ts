import { FastifyRequest } from 'fastify';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import getConfig, { Service } from '../config';
import { IspindelData } from '../index.d';
import isAxiosError from '../helpers';

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

  const services = config.services.filter((service: Service) => service.type === 'http');
  const payload: IspindelData = request.body as IspindelData;

  const postData = async (
    url: string,
    deviceLabel: string,
    data: IspindelData,
    axiosConfig: AxiosRequestConfig,
  ) => {
    try {
      request.log.info(`Sending data to ${url} for device ${deviceLabel}: ${JSON.stringify(data)}`);
      const { status, data: resData } = await axios.post(
        url,
        data,
        axiosConfig,
      );
      request.log.info(resData, `${status} response from ${url}`);
    } catch (err: unknown | AxiosError) {
      if (isAxiosError(err) && err.response) {
        request.log.error(err.response.data, `http error from ${url} for device ${deviceLabel}`);
      } else {
        request.log.error(err, `Unexpected error sending data to ${url} for device ${deviceLabel}`);
      }
    }
  };

  for (const service of services) {
    const { url, headers = undefined, deviceLabel } = service;
    const { name } = payload;
    const axiosConfig: AxiosRequestConfig = {};
    if (!url) {
      request.log.error(`'url' not set for http service ${name}. Data not sent.`);
      return;
    }

    if (headers) {
      axiosConfig.headers = headers;
    }

    if (deviceLabel) {
      payload.name = deviceLabel;
    }

    postData(url, name, payload, axiosConfig);
  }
};
