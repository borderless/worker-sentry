# Worker Sentry

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]

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
      // Wait until the response from Sentry has resolved (will continue after return below)
      event.waitUntil(
        // Sends a request to Sentry and returns the response promise.
        sentry.captureException(err, {
          tags: {},
          user: {
            ip_address: event.request.headers.get("cf-connecting-ip"),
          },
        })
      );

      // response to original request while error is being logged (above)
      return new Response(err.message || "Internal Error", { status: 500 });
    })
  );
});
```

## License

MIT

[npm-image]: https://img.shields.io/npm/v/@borderless/worker-sentry.svg?style=flat
[npm-url]: https://npmjs.org/package/@borderless/worker-sentry
[downloads-image]: https://img.shields.io/npm/dm/@borderless/worker-sentry.svg?style=flat
[downloads-url]: https://npmjs.org/package/@borderless/worker-sentry
[travis-image]: https://img.shields.io/travis/BorderlessLabs/worker-sentry.svg?style=flat
[travis-url]: https://travis-ci.org/BorderlessLabs/worker-sentry
[coveralls-image]: https://img.shields.io/coveralls/BorderlessLabs/worker-sentry.svg?style=flat
[coveralls-url]: https://coveralls.io/r/BorderlessLabs/worker-sentry?branch=master
