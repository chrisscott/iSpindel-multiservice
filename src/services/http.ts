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
    request.log.error(err, "Failed to load config in http hook");
    return;
  }

  const services = config.services.filter((service: Service) => service.type === "http");
  const payload: IspindelData = request.body as IspindelData;

  const postData = async (
    url: string,
    deviceLabel: string,
    data: IspindelData,
    headers: Record<string, string>,
  ) => {
    try {
      request.log.info(`Sending data to ${url} for device ${deviceLabel}: ${JSON.stringify(data)}`);
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(data),
      });
      const resData = await response.text();
      if (!response.ok) {
        throw new FetchError(response.status, resData);
      }
      request.log.info(`${response.status} response from ${url}: ${resData}`);
    } catch (err: unknown) {
      if (isFetchError(err)) {
        request.log.error(err.responseData, `http error from ${url} for device ${deviceLabel}`);
      } else {
        request.log.error(err, `Unexpected error sending data to ${url} for device ${deviceLabel}`);
      }
    }
  };

  const tasks: Promise<void>[] = [];
  for (const service of services) {
    const { url, headers = {}, deviceLabel } = service;
    const { name } = payload;
    if (!url) {
      request.log.error(`'url' not set for http service ${name}. Data not sent.`);
      return;
    }

    if (deviceLabel) {
      payload.name = deviceLabel;
    }

    tasks.push(postData(url, name, payload, headers as Record<string, string>));
  }
  await Promise.all(tasks);
};
