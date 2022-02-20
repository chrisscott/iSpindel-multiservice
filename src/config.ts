/// <reference types="./envsub" />
import envsub from 'envsub';

export enum ServiceTypes {
  Ubidots,
  HTTP,
  HomeAssisstant,
}

interface Service {
  type: ServiceTypes;
  deviceLabel?: string;
  token?: string;
  url: string;
  headers?: { [key: string]: string }
}

export interface Config {
  serverPath?: string;
  services?: [Service];
}

interface EnvsubResult {
  templateFile: string;
  templateContents: string;
  outputFile: string;
  outputContents: string;
}

export default async (templateFile = `${__dirname}/../config.json`): Promise<Config> => {
  const result: EnvsubResult = await envsub({ templateFile, outputFile: '/dev/null' });
  const config = JSON.parse(result.outputContents) as Config;
  return config;
};
