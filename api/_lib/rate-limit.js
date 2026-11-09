// In-memory sliding-window rate limiter for serverless instances

const trackingMap = new Map();

// Periodic cleanup of stale tracking entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of trackingMap.entries()) {
    if (now > record.resetTime) {
      trackingMap.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || '127.0.0.1';
}

function checkRateLimit(key, maxLimit, windowMs) {
  const now = Date.now();
  let record = trackingMap.get(key);

  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + windowMs
    };
    trackingMap.set(key, record);
    return { allowed: true, remaining: maxLimit - 1 };
  }

  if (record.count >= maxLimit) {
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds
    };
  }

  record.count += 1;
  return { allowed: true, remaining: maxLimit - record.count };
}

module.exports = {
  getClientIp,
  checkRateLimit
};

