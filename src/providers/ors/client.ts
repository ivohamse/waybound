import { HttpRequest } from "#types";
import { fetchWithRetry } from "#utils/retry";

export class OrsClient {
  private providerName: string;

  constructor(providerName: string) {
    this.providerName = providerName;
  }

  /**
   * Voert het verzoek kogelvrij uit inclusief de 429-handler en status-checks
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
