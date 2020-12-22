/**
 * Request interface (e.g. `fetch`).
 */
export type Fetch = (request: Request) => Promise<Response>;

/**
 * V8 call site trace.
 *
 * Ref: https://v8.dev/docs/stack-trace-api
 */
interface CallSite {
  getThis(): any;
  getTypeName(): string | null;
  getFunction(): (...args: any) => any | undefined;
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
 * Parse call sites from error instance.
 */
function getErrorStack(error: Error): CallSite[] {
  const prepareStackTrace = Error.prepareStackTrace;
  let trace: CallSite[];

  Error.prepareStackTrace = (error, v8Trace) => {
    trace = v8Trace as CallSite[];
    return prepareStackTrace?.(error, v8Trace);
  };

  Error.captureStackTrace(error, getErrorStack);
  error.stack; // Triggers `prepareStackTrace`.
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
 * Sentry levels.
 */
export type SentryLevel = "fatal" | "error" | "warning" | "info" | "debug";

/**
 * Options allows while capturing an exception.
 *
 * Documentation: https://develop.sentry.dev/sdk/event-payloads/
 */
export interface CaptureExceptionOptions {
  /** The record severity. */
  level?: SentryLevel;
  /** An arbitrary mapping of additional metadata to store with the event. */
  extra?: Record<string, unknown>;
  /** A map or list of tags for this event. Each tag must be less than 200 characters. */
  tags?: Record<string, string>;
  /** The release version of the application. */
  release?: string;
  /** The distribution of the application. */
  dist?: string;
  /** The environment name, such as `production` or `staging`. */
  environment?: string;
  /** Identifies the host from which the event was recorded. */
  serverName?: string;
  /** The name of the transaction which caused this exception. */
  transaction?: string;
  /** A list of relevant modules and their versions. */
  modules?: Record<string, string>;
  /**
   * An interface which describes the authenticated User for a request.
   *
   * Documentation: https://develop.sentry.dev/sdk/event-payloads/user/
   */
  user?: {
    /** The unique ID of the user. */
    id?: string;
    /** The username of the user. */
    username?: string;
    /** The email address of the user. */
    email?: string;
    /** The IP of the user. */
    ip?: string;
  };
  /** A list of strings used to dictate the deduplication of this event. */
  fingerprint?: string[];
  /**
   * The Request interface contains information on a HTTP request related to the event.
   *
   * Documentation: https://develop.sentry.dev/sdk/event-payloads/request
   */
  request?: {
    /** The HTTP method of the request. */
    method?: string;
    /** The URL of the request if available. The query string can be declared either as part of the `url`, or separately in `query_string`. */
    url?: string;
    /** A dictionary of submitted headers. */
    headers?: Record<string, string>;
    /** The query string component of the URL. */
    query?: string;
    /** The cookie values. */
    cookies?: string | Record<string, string> | [string, string][];
    /** A dictionary containing environment information passed from the server. */
    env?: Record<string, string>;
  };
  /**
   * The Breadcrumbs Interface specifies a series of application events, or "breadcrumbs", that occurred before an event.
   *
   * Documentation: https://develop.sentry.dev/sdk/event-payloads/breadcrumbs
   */
  breadcrumbs?: Array<{
    /** A timestamp representing when the breadcrumb occurred. */
    timestamp?: Date;
    /** The type of breadcrumb. */
    type?: string;
    /** A dotted string indicating what the crumb is or from where it comes. */
    category?: string;
    /** If a message is provided, it is rendered as text with all whitespace preserved. Very long text might be truncated in the UI. */
    message?: string;
    /** Arbitrary data associated with this breadcrumb. */
    data?: Record<string, unknown>;
    /** This defines the severity level of the breadcrumb. */
    level?: SentryLevel;
  }>;
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
    // https://develop.sentry.dev/sdk/event-payloads/
    const request = new Request(
      `https://sentry.io/api${this.sentryUrl.pathname}/store/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Cloudflare-Worker/1.0",
          "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=Cloudflare-Worker/1.0, sentry_key=${this.sentryUrl.username}`,
        },
        /* eslint-disable @typescript-eslint/naming-convention */
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
                // Ref: https://develop.sentry.dev/sdk/event-payloads/stacktrace
                stacktrace: {
                  frames: getErrorStack(error).map((callSite) => ({
                    function: callSite.getFunctionName(),
                    filename: callSite.getFileName(),
                    lineno: callSite.getLineNumber(),
                    colno: callSite.getColumnNumber(),
                    in_app: !callSite.isNative(),
                    vars: {
                      this: String(callSite.getThis()),
                    },
                  })),
                },
              },
            ],
          },
          tags: options.tags,
          user: {
            id: options.user?.id,
            email: options.user?.email,
            username: options.user?.username,
            ip_address: options.user?.ip,
          },
          request: {
            url: options.request?.url,
            method: options.request?.method,
            headers: options.request?.headers,
            query_string: options.request?.query,
            cookies: options.request?.cookies,
            env: options.request?.env,
          },
          server_name: options.serverName,
          transaction: options.transaction,
          release: options.release,
          dist: options.dist,
          environment: options.environment,
        }),
        /* eslint-enable @typescript-eslint/naming-convention */
      }
    );

    return this.fetch(request);
  }
}
