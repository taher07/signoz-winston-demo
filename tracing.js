const { NodeSDK } = require('@opentelemetry/sdk-node');
const { Resource } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require('@opentelemetry/semantic-conventions');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { LoggerProvider, BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { logs } = require('@opentelemetry/api-logs');

require('dotenv').config();

const SIGNOZ_INGESTION_KEY = process.env.SIGNOZ_INGESTION_KEY;

if (!SIGNOZ_INGESTION_KEY) {
  console.error('SIGNOZ_INGESTION_KEY is required for SigNoz Cloud');
  process.exit(1);
}

// Create resource
const resource = new Resource({
  [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'signoz-winston-demo',
  [ATTR_SERVICE_VERSION]: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
});

// Configure Log Exporter and Provider
const logExporter = new OTLPLogExporter({
  url: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT || 'https://ingest.signoz.cloud:443/v1/logs',
  headers: {
    'signoz-access-token': SIGNOZ_INGESTION_KEY,
  },
});

const loggerProvider = new LoggerProvider({
  resource,
});

loggerProvider.addLogRecordProcessor(
  new BatchLogRecordProcessor(logExporter)
);

// Register the global logger provider
logs.setGlobalLoggerProvider(loggerProvider);

// Configure the SDK
const sdk = new NodeSDK({
  resource,
  traceExporter: new OTLPTraceExporter({
    // SigNoz Cloud endpoint for traces
    url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'https://ingest.signoz.cloud:443/v1/traces',
    headers: {
      'signoz-access-token': SIGNOZ_INGESTION_KEY,
    },
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      // SigNoz Cloud endpoint for metrics
      url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'https://ingest.signoz.cloud:443/v1/metrics',
      headers: {
        'signoz-access-token': SIGNOZ_INGESTION_KEY,
      },
    }),
    exportIntervalMillis: 60000, // 60 seconds for cloud to reduce data points
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-winston': {
        enabled: true
      },
    })
  ]
});

// Initialize the SDK and register with the OpenTelemetry API
sdk.start()

// Gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
  Promise.all([
    sdk.shutdown(),
    loggerProvider.shutdown(),
  ])
    .then(() => console.log('OpenTelemetry terminated successfully'))
    .catch((error) => console.log('Error terminating OpenTelemetry', error))
    .finally(() => process.exit(0));
});
