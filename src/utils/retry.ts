interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
}

/**
 * Voert een fetch-operatie uit met automatische exponential backoff, jitter
 * en strikte naleving van de HTTP 429 'Retry-After' header.
 */
async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options: RetryOptions = {},
): Promise<Response> {
  const {
    maxRetries = 4,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    factor = 2,
  } = options;

  let attempt = 0;

  while (true) {
    try {
      attempt++;
      const response = await fetch(url, init);

      // Als de status 429 is, moeten we wachten en opnieuw proberen
      if (response.status === 429) {
        if (attempt > maxRetries) {
          return response; // Geef de 429 uiteindelijk terug als retries op zijn
        }

        // Basis exponential delay berekening
        let delay = initialDelayMs * Math.pow(factor, attempt - 1);

        // Voeg Jitter (ruis) toe om 'thundering herds' op de API-server te voorkomen
        delay = Math.random() * delay;

        // Controleer of de server een 'Retry-After' header heeft meegestuurd
        const retryAfter = response.headers.get("Retry-After");
        if (retryAfter) {
          const seconds = parseInt(retryAfter, 10);
          if (!isNaN(seconds)) {
            delay = seconds * 1000; // Zet seconden om naar milliseconden
          }
        }

        // Zorg dat we nooit langer wachten dan het maximum
        const finalDelay = Math.min(delay, maxDelayMs);

        console.warn(
          `[waybound] HTTP 429 (Too Many Requests) gedetecteerd op ${url}. ` +
            `Poging ${attempt}/${maxRetries}. Wachten op retry in ${finalDelay.toFixed(0)}ms...`,
        );

        await new Promise((resolve) => setTimeout(resolve, finalDelay));
        continue; // Spring terug naar het begin van de loop om het opnieuw te proberen
      }

      // Bij alle andere statussen (succes of andere fouten zoals 400/500) geven we de response direct terug
      return response;
    } catch (error: any) {
      // Dit vangt netwerk-crashes op (bijv. internet valt weg)
      if (attempt > maxRetries) {
        throw error;
      }

      const networkDelay = Math.min(
        initialDelayMs * Math.pow(factor, attempt - 1),
        maxDelayMs,
      );
      console.warn(
        `[waybound] Netwerkfout. Retry ${attempt}/${maxRetries} in ${networkDelay}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, networkDelay));
    }
  }
}

export { fetchWithRetry };
