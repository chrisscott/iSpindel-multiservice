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

  const services = config.services.filter((service: Service) => service.type === 'homeassistant');
  const data: IspindelData = request.body as IspindelData;

  const postData = async (
    url: string | undefined,
    deviceLabel: string,
    stateName: string,
    state: unknown,
    unitOfMeasurement: string,
    token: string | undefined,
    axiosConfig: AxiosRequestConfig,
  ) => {
    const payload = {
      state,
      attributes: {
        unit_of_measurement: unitOfMeasurement,
        friendly_name: `${deviceLabel} ${stateName}`,
      },
    };

    request.log.info(`Sending data to homeassistant at ${url} for device ${deviceLabel} for state ${stateName} `);
    try {
      const { status, data: resData } = await axios.post(
        `${url}/api/states/sensor.${deviceLabel}_${stateName}`,
        payload,
        {
          ...axiosConfig,
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      request.log.info(resData, `${status} response from ${url}`);
    } catch (err: unknown | AxiosError) {
      if (isAxiosError(err) && err.response) {
        request.log.error(err.response.data, `Error from homeassistant at ${url} for device ${deviceLabel}`);
      } else {
        request.log.error(err, `Unexpected error sending data to homeassistant at ${url} for device ${deviceLabel}`);
      }
    }
  };

  for (const service of services) {
    const { deviceLabel = data.name, url, token } = service;
    const axiosConfig: AxiosRequestConfig = {};
    if (!url) {
      request.log.error(`'url' not set for homeassistant service ${deviceLabel}. Data not sent.`);
      break;
    }

    const {
      temperature,
      battery,
      gravity,
      angle,
    } = data;

    postData(url, deviceLabel, 'temperature', temperature, '°F', token, axiosConfig);
    postData(url, deviceLabel, 'battery', battery, 'Volts', token, axiosConfig);
    postData(url, deviceLabel, 'gravity', gravity, 'SG', token, axiosConfig);
    postData(url, deviceLabel, 'angle', angle, 'Degrees', token, axiosConfig);
  }
};
