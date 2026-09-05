import { HttpRequest } from "#types";
import { fetchWithRetry } from "#utils/retry";

export class GraphHopperClient {
  private providerName: string;

  constructor(providerName: string) {
    this.providerName = providerName;
  }

  /**
   * Schiet de request kogelvrij af en handelt HTTP-foutcodes centraal af
   */
  public async execute(request: HttpRequest): Promise<any> {
    const response = await fetchWithRetry(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `[${this.providerName} Client Error] (${response.status}): ${errText || response.statusText}`,
      );
    }

    return response.json();
  }
}
