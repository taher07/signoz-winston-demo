const winston = require('winston');
const { trace, context } = require('@opentelemetry/api');
const { logs, SeverityNumber } = require('@opentelemetry/api-logs');

// Map Winston levels to OpenTelemetry severity numbers
const severityMapping = {
  error: SeverityNumber.ERROR,
  warn: SeverityNumber.WARN,
  info: SeverityNumber.INFO,
  http: SeverityNumber.INFO,
  verbose: SeverityNumber.DEBUG,
  debug: SeverityNumber.DEBUG,
  silly: SeverityNumber.TRACE,
};

// Get OpenTelemetry logger
const otelLogger = logs.getLogger('winston-logger', '1.0.0');

// Custom transport that sends logs to OpenTelemetry with trace context
class OpenTelemetryTransport extends winston.Transport {
  constructor(opts) {
    super(opts);
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Get current span context
    const span = trace.getSpan(context.active());
    let spanContext = {};
    
    if (span) {
      const sc = span.spanContext();
      spanContext = {
        traceId: sc.traceId,
        spanId: sc.spanId,
        traceFlags: sc.traceFlags,
      };
    }

    // Map Winston level to OpenTelemetry severity
    const severityNumber = severityMapping[info.level] || SeverityNumber.INFO;

    // Prepare attributes
    const attributes = {};
    
    // Add all properties except internal ones
    Object.keys(info).forEach(key => {
      if (!['level', 'message', 'timestamp', 'Symbol(level)', 'Symbol(message)'].includes(key) && 
          !key.startsWith('Symbol(')) {
        attributes[key] = info[key];
      }
    });

    // Emit log record with trace context
    otelLogger.emit({
      severityNumber,
      severityText: info.level,
      body: info.message,
      attributes,
      context: span ? trace.setSpan(context.active(), span) : undefined,
    });

    callback();
  }
}

// Custom format to inject trace context into logs (for console output)
const injectTraceContext = winston.format((info) => {
  const span = trace.getSpan(context.active());
  if (span) {
    const spanContext = span.spanContext();
    // Add trace context to log metadata
    info.traceId = spanContext.traceId;
    info.spanId = spanContext.spanId;
    info.traceFlags = spanContext.traceFlags;
  }
  return info;
});

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    injectTraceContext(), // Add trace context
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: process.env.OTEL_SERVICE_NAME || 'signoz-winston-demo' },
  transports: [
    // Console transport with pretty print for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, traceId, spanId, ...metadata }) => {
          let msg = `${timestamp} [${level}]: ${message}`;
          if (traceId) {
            msg += ` [traceId=${traceId}]`;
          }
          if (spanId) {
            msg += ` [spanId=${spanId}]`;
          }
          // Remove service from metadata for cleaner output
          if (metadata.service) {
            delete metadata.service;
          }
          if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
          }
          return msg;
        })
      )
    }),
    // Custom OpenTelemetry transport
    new OpenTelemetryTransport({
      level: process.env.LOG_LEVEL || 'info',
    }),
    // File transport for production (optional)
    new winston.transports.File({ 
      filename: 'app.log',
      format: winston.format.json()
    })
  ]
});

module.exports = logger;
