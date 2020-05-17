/**
 * Request interface (e.g. `fetch`).
 */
export type Fetch = (request: Request) => Promise<Response>;

/**
 * V8 call site trace.
 */
interface CallSite {
  getThis(): any;
  getTypeName(): string | null;
  getFunction(): Function | undefined;
  getFunctionName(): string | null;
  getMethodName(): string | null;
  getFileName(): string | null;
  getLineNumber(): number | null;
  getColumnNumber(): number | null;
  getEvalOrigin(): string | undefined;
  isToplevel(): boolean;
  isEval(): boolean;
  isNative(): boolean;
  isConstructor(): boolean;
  isAsync(): boolean;
  isPromiseAll(): boolean;
  getPromiseIndex(): number | null;
}

/**
 * Parse a stack trace from
 */
export function getErrorStack(error: Error): CallSite[] {
  const prepareStackTrace = Error.prepareStackTrace;
  let trace: CallSite[];

  Error.prepareStackTrace = (error, v8Trace) => {
    trace = v8Trace as CallSite[];
    return prepareStackTrace?.(error, v8Trace);
  };

  Error.captureStackTrace(error, getErrorStack);
  error.stack; // Trigger `prepareStackTrace`.

  Error.prepareStackTrace = prepareStackTrace;

  return trace!;
}

/**
 * Sentry initialization options.
 */
export interface SentryOptions {
  dsn: string;
  fetch?: Fetch;
}

/**
 * Options allows while capturing an exception.
 */
export interface CaptureExceptionOptions {
  level?: "fatal" | "error" | "warning" | "info" | "debug";
  extra?: object;
  tags?: Record<string, string>;
  release?: string;
  environment?: string;
  serverName?: string;
  transaction?: string;
  user?: object;
  fingerprint?: string[];
  request?: {
    url?: string;
    method?: string;
    query?: string;
  };
}

/**
 * Simple sentry client using `fetch`.
 */
export class Sentry {
  sentryUrl: URL;
  fetch: Fetch;

  constructor(options: SentryOptions) {
    this.sentryUrl = new URL(options.dsn);
    this.fetch = options.fetch || fetch.bind(null);
  }

  /**
   * Sends the exception to Sentry and returns the `Response` promise.
   */
  captureException(error: Error, options: CaptureExceptionOptions = {}) {
    const request = new Request(
      `https://sentry.io/api${this.sentryUrl.pathname}/store/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Cloudflare-Worker/1.0",
          "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=Cloudflare-Worker/1.0, sentry_key=${this.sentryUrl.username}`,
        },
        /* eslint-disable @typescript-eslint/camelcase */
        body: JSON.stringify({
          logger: "worker",
          platform: "javascript",
          level: options.level,
          extra: options.extra,
          fingerprint: options.fingerprint,
          exception: {
            values: [
              {
                type: error.name,
                value: error.message,
                stacktrace: {
                  frames: getErrorStack(error).map((callSite) => ({
                    function: callSite.getFunctionName(),
                    filename: callSite.getFileName(),
                    lineno: callSite.getLineNumber(),
                    colno: callSite.getColumnNumber(),
                    in_app: !callSite.isNative(),
                  })),
                },
              },
            ],
          },
          tags: options.tags,
          user: options.user,
          request: {
            url: options.request?.url,
            method: options.request?.method,
            query_string: options.request?.query,
          },
          server_name: options.serverName,
          transaction: options.transaction,
          release: options.release,
          environment: options.environment,
        }),
        /* eslint-enable @typescript-eslint/camelcase */
      }
    );

    return this.fetch(request);
  }
}
