import "cross-fetch/polyfill";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Sentry } from "./index";

describe("worker sentry", () => {
  const dsn = "https://123@456.ingest.sentry.io/789";
  let sentry: Sentry;
  let fetch: any;

  beforeEach(() => {
    fetch = jest.fn<() => Response>();
    sentry = new Sentry({ dsn, fetch, filePrefix: "" });
  });

  describe("with 200 response", () => {
    beforeEach(() => {
      fetch.mockResolvedValueOnce(new Response(null, { status: 200 }));
    });

    it("should send exception to sentry", async () => {
      const response = await sentry.captureException(new Error("Boom!"));

      expect(response.status).toEqual(200);
      expect(fetch).toBeCalledTimes(1);

      const request = fetch.mock.calls[0][0];

      expect(request.url).toEqual("https://sentry.io/api/789/store/");
      expect(request.method).toEqual("POST");

      const data = await request.json();
      const exception = data.exception.values[0];
      const hasException = exception.stacktrace.frames.some((x: any) =>
        /[\\/]worker-sentry[\\/]/.test(x.filename)
      );

      expect(hasException).toEqual(true);
      expect(exception.type).toEqual("Error");
      expect(exception.value).toEqual("Boom!");
      expect(data.platform).toEqual("javascript");
    });

    it("should send all properties", async () => {
      const response = await sentry.captureException(new Error("Boom!"), {
        level: "error",
        release: "test",
        dist: "test",
        fingerprint: [],
        environment: "production",
        serverName: "test",
        breadcrumbs: [{ type: "error", message: "error" }],
        transaction: "test",
        tags: { test: "test" },
        extra: { test: true },
      });

      expect(response.status).toEqual(200);
      expect(fetch).toBeCalledTimes(1);

      const request = fetch.mock.calls[0][0];
      const data = await request.json();

      expect(Object.keys(data)).toEqual([
        "logger",
        "platform",
        "level",
        "extra",
        "fingerprint",
        "exception",
        "tags",
        "user",
        "request",
        "breadcrumbs",
        "server_name",
        "transaction",
        "release",
        "dist",
        "environment",
      ]);
    });
  });
});
