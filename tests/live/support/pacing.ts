function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * Keeps independent provider accounts from being paced as though they share a
 * quota. The suite itself is sequential, but keeping this state per provider
 * also makes that intent explicit if its execution model changes later.
 */
export class ProviderPacer {
  private readonly finishedAt = new Map<string, number>();

  public async wait(provider: string, delayMs: number): Promise<void> {
    const previous = this.finishedAt.get(provider);
    if (previous === undefined || delayMs === 0) return;

    const remaining = previous + delayMs - performance.now();
    if (remaining > 0) await sleep(remaining);
  }

  public complete(provider: string): void {
    this.finishedAt.set(provider, performance.now());
  }
}
