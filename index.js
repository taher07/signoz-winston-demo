const express = require('express');
const { trace, context, SpanStatusCode } = require('@opentelemetry/api');
const logger = require('./logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Create a tracer
const tracer = trace.getTracer('signoz-winston-demo', '1.0.0');

// Health check endpoint
app.get('/health', (req, res) => {
  logger.info('Health check requested');
  res.json({ status: 'healthy', service: 'signoz-winston-demo' });
});

// Simple endpoint
app.get('/', (req, res) => {
  logger.info('Root endpoint accessed');
  res.json({ message: 'Welcome to OpenTelemetry + Winston example!' });
});

// Endpoint with custom span
app.get('/users/:id', async (req, res) => {
  const userId = req.params.id;
  
  // Start a custom span
  const span = tracer.startSpan('get-user-details');
  
  try {
    // Set span attributes
    span.setAttributes({
      'user.id': userId,
      'http.method': req.method,
      'http.url': req.url
    });
    
    // Log with trace context automatically injected
    logger.info('Fetching user details', { userId });
    
    // Simulate some async work
    await context.with(trace.setSpan(context.active(), span), async () => {
      // This log will have the span context of our custom span
      logger.debug('Processing user request', { step: 'validation' });
      
      // Simulate database call
      const user = await simulateDatabaseCall(userId);
      
      if (!user) {
        logger.warn('User not found', { userId });
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'User not found' });
        res.status(404).json({ error: 'User not found' });
      } else {
        logger.info('User retrieved successfully', { userId, userName: user.name });
        res.json(user);
      }
    });
    
  } catch (error) {
    logger.error('Error fetching user', { userId, error: error.message });
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    span.end();
  }
});

// Endpoint that demonstrates nested spans
app.post('/orders', async (req, res) => {
  const span = tracer.startSpan('create-order');
  
  try {
    const { userId, items } = req.body;
    span.setAttributes({
      'order.user_id': userId,
      'order.item_count': items?.length || 0
    });
    
    await context.with(trace.setSpan(context.active(), span), async () => {
      logger.info('Creating new order', { userId, itemCount: items?.length });
      
      // Validate order
      await validateOrder(userId, items);
      
      // Process payment
      const paymentResult = await processPayment(userId, items);
      
      // Create order record
      const order = await createOrderRecord(userId, items, paymentResult);
      
      logger.info('Order created successfully', { orderId: order.id, userId });
      res.json(order);
    });
    
  } catch (error) {
    logger.error('Order creation failed', { error: error.message });
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    res.status(500).json({ error: error.message });
  } finally {
    span.end();
  }
});

// Helper functions with their own spans
async function simulateDatabaseCall(userId) {
  const span = tracer.startSpan('database-query');
  
  try {
    span.setAttributes({
      'db.system': 'postgresql',
      'db.operation': 'SELECT',
      'db.sql.table': 'users'
    });
    
    logger.debug('Querying database for user', { userId });
    
    // Simulate async database operation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Mock user data
    if (userId === '123') {
      return { id: userId, name: 'John Doe', email: 'john@example.com' };
    }
    return null;
    
  } finally {
    span.end();
  }
}

async function validateOrder(userId, items) {
  const span = tracer.startSpan('validate-order');
  
  try {
    logger.debug('Validating order', { userId, itemCount: items?.length });
    
    if (!items || items.length === 0) {
      throw new Error('Order must contain at least one item');
    }
    
    // Simulate validation logic
    await new Promise(resolve => setTimeout(resolve, 50));
    
  } finally {
    span.end();
  }
}

async function processPayment(userId, items) {
  const span = tracer.startSpan('process-payment');
  
  try {
    const total = items.reduce((sum, item) => sum + (item.price || 0), 0);
    span.setAttribute('payment.amount', total);
    
    logger.info('Processing payment', { userId, amount: total });
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      transactionId: `txn_${Date.now()}`,
      amount: total,
      status: 'completed'
    };
    
  } finally {
    span.end();
  }
}

async function createOrderRecord(userId, items, payment) {
  const span = tracer.startSpan('create-order-record');
  
  try {
    logger.debug('Creating order record in database');
    
    // Simulate database write
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const order = {
      id: `order_${Date.now()}`,
      userId,
      items,
      payment,
      createdAt: new Date().toISOString()
    };
    
    return order;
    
  } finally {
    span.end();
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { 
    error: err.message, 
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Sending traces to SigNoz Cloud (${process.env.OTEL_SERVICE_NAME})`);
  console.log(`Check ${process.env.SIGNOZ_DASHBOARD_URL || 'your SigNoz Cloud dashboard'} for traces and logs`);
});
