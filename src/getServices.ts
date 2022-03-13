import { FastifyRequest } from 'fastify';
import getConfig, { Service, ServiceType } from './config';

export default async (
  request: FastifyRequest,
  serviceType: ServiceType,
): Promise<Service[] | undefined> => {
  if (request.is404 || request.method === 'GET') {
    return undefined;
  }

  const config = await getConfig();
  if (config instanceof Error || !config.services) {
    return undefined;
  }

  const services = config.services.filter((service) => service.type === serviceType);
  if (services.length === 0) {
    return undefined;
  }
  return services;
};
