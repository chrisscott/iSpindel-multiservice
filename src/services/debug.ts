import { FastifyRequest } from 'fastify';
import { IspindelData } from '../index.d';

export default async (request: FastifyRequest): Promise<void> => {
  const payload: IspindelData = request.body as IspindelData;

  request.log.debug(payload, 'Received data from iSpindel');
};
