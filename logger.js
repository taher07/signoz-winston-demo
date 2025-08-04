const winston = require('winston');
const { logs, SeverityNumber } = require('@opentelemetry/api-logs');
const { OpenTelemetryTransportV3 } = require('@opentelemetry/winston-transport');
const { loggerProvider } = require('./tracing');

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

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
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
        winston.format.printf(({ timestamp, level, message, ...metadata }) => {
          let msg = `${timestamp} [${level}]: ${message}`;
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
    new OpenTelemetryTransportV3({loggerProvider}),
    // File transport for production (optional)
    new winston.transports.File({ 
      filename: 'app.log',
      format: winston.format.json()
    })
  ]
});

module.exports = logger;
