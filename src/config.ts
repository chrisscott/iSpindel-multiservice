/// <reference types="./envsub" />
import envsub from 'envsub';

interface Service {
  type: string;
  deviceLabel?: string;
  token?: string;
  url?: string;
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

const templateFile = `${__dirname}/../config.json`;

export default async (): Promise<Config> => {
  const result: EnvsubResult = await envsub({ templateFile, outputFile: '/dev/null' });
  const config: Config = JSON.parse(result.outputContents);
  return config;
};
