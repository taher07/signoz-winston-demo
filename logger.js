const winston = require('winston');
const { OpenTelemetryTransportV3 } = require('@opentelemetry/winston-transport');

require('dotenv').config();

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
    new OpenTelemetryTransportV3(),
    // File transport for production (optional)
    new winston.transports.File({ 
      filename: 'app.log',
      format: winston.format.json()
    })
  ]
});

module.exports = logger;
