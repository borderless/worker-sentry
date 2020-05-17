import "cross-fetch/polyfill";
import { Sentry, Fetch } from "./index";

describe("worker sentry", () => {
  const dsn = "https://123@456.ingest.sentry.io/789";
  let sentry: Sentry;
  let fetch: jest.Mock;

  beforeEach(() => {
    fetch = jest.fn();
    sentry = new Sentry({ dsn, fetch });
  });

  describe("with 200 response", () => {
    beforeEach(() => {
      fetch.mockResolvedValueOnce(new Response(null, { status: 200 }));
    });

    it("should send exception to sentry", async () => {
      const response = await sentry.captureException(new Error("Boom!"));

      expect(response.status).toEqual(200);

      const request = fetch.mock.calls[0][0];

      expect(request.url).toEqual("https://sentry.io/api/789/store/");
      expect(request.method).toEqual("POST");

      const data = await request.json();
      const exception = data.exception.values[0];
      const hasException = exception.stacktrace.frames.some(
        (x: any) => x.filename === __filename
      );

      expect(hasException).toEqual(true);
      expect(exception.type).toEqual("Error");
      expect(exception.value).toEqual("Boom!");
      expect(data.platform).toEqual("javascript");
    });
  });
});
