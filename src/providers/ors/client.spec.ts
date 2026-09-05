import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrsClient } from "./client";
import { HttpRequest } from "#types";

describe("OrsClient", () => {
  const client = new OrsClient("OpenRouteService");

  beforeEach(() => {
    // Reset alle mocks voor elke test, zodat ze elkaar niet beïnvloeden
    vi.restoreAllMocks();
  });

  it("zou een succesvolle JSON response netjes moeten retourneren", async () => {
    const mockResponseData = { status: "ok", info: "route data" };

    // KOGELVRIJE MOCK: We bespioneren de globale fetch direct via globalThis
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponseData,
    } as Response);

    const mockRequest: HttpRequest = {
      url: "https://heigit.org",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: true }),
    };

    const result = await client.execute(mockRequest);

    // 1. Controleer of de output exact overeenkomt met wat de 'server' stuurde
    expect(result).toEqual(mockResponseData);

    // 2. Controleer of fetch daadwerkelijk is aangeroepen met de juiste URL en opties
    expect(fetchSpy).toHaveBeenCalledWith(
      mockRequest.url,
      expect.objectContaining({
        method: "POST",
        body: mockRequest.body,
      }),
    );
  });

  it("zou een duidelijke foutmelding moeten gooien als de server weigert (bijv. 404)", async () => {
    // We simuleren een boze server die een 404 Not Found geeft met een stukje tekst
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () => "Endpoint bestaat niet",
    } as Response);

    const mockRequest: HttpRequest = {
      url: "https://heigit.org",
      method: "GET",
      headers: {},
    };

    // We verwachten dat de client keihard crasht met onze op maat gemaakte foutmelding
    await expect(client.execute(mockRequest)).rejects.toThrow(
      "[OpenRouteService Client Error] (404): Endpoint bestaat niet",
    );
  });
});
