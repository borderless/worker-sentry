# Worker Sentry

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Build status][build-image]][build-url]
[![Build coverage][coverage-image]][coverage-url]

> Sentry client for Cloudflare Workers using `fetch` and native [V8 stack traces](https://v8.dev/docs/stack-trace-api).

## Installation

```
npm install @borderless/worker-sentry --save
```

## Usage

```ts
import { Sentry } from "@borderless/worker-sentry";

const sentry = new Sentry({ dsn: "https://123@456.ingest.sentry.io/789" });

addEventListener("fetch", (event) => {
  event.respondWith(
    handler(event.request).catch((err) => {
      // Extend the event lifetime until the response from Sentry has resolved.
      // Docs: https://developers.cloudflare.com/workers/runtime-apis/fetch-event#methods
      event.waitUntil(
        // Sends a request to Sentry and returns the response promise.
        sentry.captureException(err, {
          tags: {},
          user: {
            ip_address: event.request.headers.get("cf-connecting-ip"),
          },
        })
      );

      // Respond to the original request while the error is being logged (above).
      return new Response(err.message || "Internal Error", { status: 500 });
    })
  );
});
```

## License

MIT

[npm-image]: https://img.shields.io/npm/v/@borderless/worker-sentry
[npm-url]: https://npmjs.org/package/@borderless/worker-sentry
[downloads-image]: https://img.shields.io/npm/dm/@borderless/worker-sentry
[downloads-url]: https://npmjs.org/package/@borderless/worker-sentry
[build-image]: https://img.shields.io/github/workflow/status/borderless/worker-sentry/CI/main
[build-url]: https://github.com/borderless/worker-sentry/actions/workflows/ci.yml?query=branch%3Amain
[coverage-image]: https://img.shields.io/codecov/c/gh/borderless/worker-sentry
[coverage-url]: https://codecov.io/gh/borderless/worker-sentry
