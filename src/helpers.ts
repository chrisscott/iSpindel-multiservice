import { AxiosError } from 'axios';

export default (error: unknown | AxiosError) : error is AxiosError => {
  if ((error as AxiosError).isAxiosError) {
    return true;
  }
  return false;
};
