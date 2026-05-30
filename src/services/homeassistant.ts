import { FastifyRequest } from "fastify";
import getConfig, { Service } from "../config";
import { IspindelData } from "../index.d";
import { FetchError, isFetchError } from "../helpers";

export default async (request: FastifyRequest): Promise<void> => {
  if (!request.body) {
    return;
  }

  let config;

  try {
    config = await getConfig();
  } catch (err) {
    request.log.error(err, "Failed to load config in homeassistant hook");
    return;
  }

  const services = config.services.filter((service: Service) => service.type === "homeassistant");
  const data: IspindelData = request.body as IspindelData;

  const postData = async (
    url: string | undefined,
    deviceLabel: string,
    stateName: string,
    state: unknown,
    unitOfMeasurement: string,
    token: string | undefined,
  ) => {
    const payload = {
      state,
      attributes: {
        unit_of_measurement: unitOfMeasurement,
        friendly_name: `${deviceLabel} ${stateName}`,
      },
    };

    request.log.info(
      `Sending data to homeassistant at ${url} for device ${deviceLabel} for state ${stateName} `,
    );
    try {
      const response = await fetch(
        `${url}/api/states/sensor.${encodeURIComponent(deviceLabel)}_${stateName}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );
      const resData = await response.text();
      if (!response.ok) {
        throw new FetchError(response.status, resData);
      }
      request.log.info(`${response.status} response from ${url}: ${resData}`);
    } catch (err: unknown) {
      if (isFetchError(err)) {
        request.log.error(
          err.responseData,
          `Error from homeassistant at ${url} for device ${deviceLabel}`,
        );
      } else {
        request.log.error(
          err,
          `Unexpected error sending data to homeassistant at ${url} for device ${deviceLabel}`,
        );
      }
    }
  };

  const tasks: Promise<void>[] = [];
  for (const service of services) {
    const { deviceLabel = data.name, url, token } = service;
    if (!url) {
      request.log.error(`'url' not set for homeassistant service ${deviceLabel}. Data not sent.`);
      break;
    }

    const { temperature, battery, gravity, angle } = data;

    tasks.push(postData(url, deviceLabel, "temperature", temperature, "°F", token));
    tasks.push(postData(url, deviceLabel, "battery", battery, "Volts", token));
    tasks.push(postData(url, deviceLabel, "gravity", gravity, "SG", token));
    tasks.push(postData(url, deviceLabel, "angle", angle, "Degrees", token));
  }
  await Promise.all(tasks);
};
