import { describe, it, expect, vi, beforeEach } from "vitest";
import { GraphHopperClient } from "./client";
import { HttpRequest } from "#types";

describe("GraphHopperClient", () => {
  const client = new GraphHopperClient("GraphHopper");

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("zou een succesvolle JSON response netjes moeten retourneren", async () => {
    const mockResponseData = { paths: [{ distance: 500 }] };

    // We bespioneren de globale fetch via globalThis
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponseData,
    } as Response);

    const mockRequest: HttpRequest = {
      url: "https://graphhopper.com",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points: [] }),
    };

    const result = await client.execute(mockRequest);

    expect(result).toEqual(mockResponseData);
    expect(fetchSpy).toHaveBeenCalledWith(
      mockRequest.url,
      expect.objectContaining({
        method: "POST",
        body: mockRequest.body,
      }),
    );
  });

  it("zou een duidelijke foutmelding moeten gooien als GraphHopper weigert (bijv. 400)", async () => {
    // We simuleren een GraphHopper error payload
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => "Profile not found",
    } as Response);

    const mockRequest: HttpRequest = {
      url: "https://graphhopper.com",
      method: "POST",
      headers: {},
    };

    await expect(client.execute(mockRequest)).rejects.toThrow(
      "[GraphHopper Client Error] (400): Profile not found",
    );
  });
});
