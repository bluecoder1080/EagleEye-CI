import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { createLogger } from "../utils";

const logger = createLogger("HttpClient");

export class HttpClient {
  private client: AxiosInstance;

  constructor(baseURL?: string, headers?: Record<string, string>) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (axios.isAxiosError(error)) {
          logger.error(
            `HTTP ${error.config?.method?.toUpperCase()} ${error.config?.url} failed: ${error.message}`,
          );
        }
        return Promise.reject(error);
      },
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    logger.info(`GET ${url}`);
    const { data } = await this.client.get<T>(url, config);
    return data;
  }

  async post<T>(
    url: string,
    body?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    logger.info(`POST ${url}`);
    const { data } = await this.client.post<T>(url, body, config);
    return data;
  }

  async put<T>(
    url: string,
    body?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    logger.info(`PUT ${url}`);
    const { data } = await this.client.put<T>(url, body, config);
    return data;
  }
}
