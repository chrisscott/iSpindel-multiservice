import { FastifyRequest } from 'fastify';
import axios, { AxiosRequestConfig } from 'axios';
import { ServiceType } from '../config';
import getServices from '../getServices';

import { IspindelData } from '../index.d';

export default async (request: FastifyRequest): Promise<void> => {
  const services = await getServices(request, ServiceType.HomeAssisstant);
  if (!services) {
    return;
  }

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
      // eslint-disable-next-line no-console
      request.log.info(resData, `${status} response from ${url}`);
    } catch (err) {
      request.log.error(err, `Error from homeassistant at ${url} for device ${name}`);
    }
  };

  services.forEach(async (service) => {
    const { deviceLabel = data.name, url, token } = service;
    const axiosConfig: AxiosRequestConfig = {};
    if (!url) {
      request.log.error(`'url' not set for homeassistant service ${deviceLabel}. Data not sent.`);
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
  });
};
