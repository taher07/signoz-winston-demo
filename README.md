# Logging NodeJS logs to SigNoz Cloud using winston logger
A simple Node.js app that sends traces and logs to SigNoz Cloud with automatic correlation.

## Quick Start

### 1. Get SigNoz Cloud Account
Sign up at [https://signoz.cloud](https://signoz.cloud) and get your ingestion key from Settings → Ingestion Settings.

### 2. Setup
```bash
# Clone the repo
git clone <your-repo-url> signoz-winston-demo
cd signoz-winston-demo

# Install dependencies
npm install

# Create .env file from .env.example
cp .env.example .env
```

### 3. Substitute actual values in .env
SIGNOZ_INGESTION_KEY -> Add your ingestion key here

OTEL_EXPORTER_OTLP_TRACES_ENDPOINT -> https://ingest.<region_name>.signoz.cloud:443/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT -> https://ingest.<region_name>.signoz.cloud:443/v1/metrics
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT -> https://ingest.<region_name>.signoz.cloud:443/v1/logs

### 4. Run
```bash
npm start
```

### 5. Test
```bash
# Simple request
curl http://localhost:3000/users/123

# Create order
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"userId": "123", "items": [{"name": "Widget", "price": 29.99}]}'
```

### 5. View in SigNoz
1. Go to your SigNoz Cloud dashboard
2. Click **Traces** to see requests
3. Click any trace to see correlated logs
4. Use **Logs** tab to search all logs

## What This Does

- **Auto-instrumentation**: Automatically tracks all HTTP requests, database calls, etc.
- **Custom spans**: Add your own spans for business logic
- **Correlated logs**: All logs include trace IDs for easy debugging
- **Winston integration**: Use familiar Winston logging with automatic OpenTelemetry export

## Environment Variables

Create a `.env` file:
```
SIGNOZ_INGESTION_KEY=your-key-here    # Required
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT    # https://ingest.<region>.signoz.cloud:443/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT   # https://ingest.<region>.signoz.cloud:443/v1/metrics
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT      # https://ingest.<region>.signoz.cloud:443/v1/logs
OTEL_SERVICE_NAME=my-app              # Optional (default: signoz-winston-demo)
PORT=3000                             # Optional (default: 3000)
LOG_LEVEL=debug                       # Optional (default: info)
```

## Project Structure
```
├── index.js      # Express app with endpoints
├── tracing.js    # OpenTelemetry setup (loaded first)
├── logger.js     # Winston logger with trace correlation
├── .env.example  # Example configuration file
├── .env          # Your configuration (create this from .env.example)
└── package.json  # Dependencies
```

## Common Issues

**No data in SigNoz?**
- Check your ingestion key is correct
- Look for errors in console
- Make sure you're making requests to generate traces

**Logs not showing?**
- Logs only appear when inside a trace/span
- Check the Logs tab in SigNoz
- Try filtering by service name

That's it! Your traces and logs are now in SigNoz Cloud.