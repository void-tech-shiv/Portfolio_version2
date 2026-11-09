const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function sanitizeString(input, maxLength = 1000) {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength);
}

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  return trimmed.length <= 254 && EMAIL_REGEX.test(trimmed);
}

function validateEnquiryInput(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid submission payload.' };
  }

  // Honeypot check: If the hidden honeypot field is filled, reject silently
  if (body.company_url || body.website_hp) {
    return { valid: false, spam: true, error: 'Spam detected.' };
  }

  const name = sanitizeString(body.name, 100);
  const email = sanitizeString(body.email, 120).toLowerCase();
  const topic = sanitizeString(body.topic || 'General Enquiry', 80);
  const message = sanitizeString(body.message, 2500);
  const consent = Boolean(body.consent);

  if (!name || name.length < 2) {
    return { valid: false, error: 'Please enter your name (at least 2 characters).' };
  }

  if (!isValidEmail(email)) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }

  if (!message || message.length < 10) {
    return { valid: false, error: 'Please enter a message with at least 10 characters.' };
  }

  if (!consent) {
    return { valid: false, error: 'Please accept the privacy consent to submit your enquiry.' };
  }

  return {
    valid: true,
    data: {
      name,
      email,
      topic,
      message,
      consent,
      status: 'new',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  };
}

function validateFeedbackInput(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid feedback payload.' };
  }

  // Honeypot check
  if (body.company_url || body.website_hp) {
    return { valid: false, spam: true, error: 'Spam detected.' };
  }

  const message = sanitizeString(body.message, 1500);
  const senderName = sanitizeString(body.senderName || 'Anonymous', 100);
  const category = sanitizeString(body.category || 'General', 50);
  const rating = Number.isInteger(body.rating) && body.rating >= 1 && body.rating <= 5 ? body.rating : null;

  if (!message || message.length < 5) {
    return { valid: false, error: 'Please share feedback with at least 5 characters.' };
  }

  return {
    valid: true,
    data: {
      message,
      senderName,
      category,
      rating,
      status: 'new',
      isPublic: false, // strictly private by default
      createdAt: new Date(),
      updatedAt: new Date()
    }
  };
}

function validateProjectInput(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid project payload.' };
  }

  const title = sanitizeString(body.title, 120);
  const category = sanitizeString(body.category || 'SOFTWARE', 50).toUpperCase();
  const status = sanitizeString(body.status || 'IN DEVELOPMENT', 50);
  const description = sanitizeString(body.description, 500);
  const statusNote = sanitizeString(body.statusNote, 500);
  const problem = sanitizeString(body.problem, 1000);
  const approach = sanitizeString(body.approach, 1000);
  const architecture = sanitizeString(body.architecture, 1000);
  const githubUrl = sanitizeString(body.githubUrl, 255);
  const liveUrl = sanitizeString(body.liveUrl, 255);
  const image = sanitizeString(body.image, 255);
  const illustration = Boolean(body.illustration);
  const published = body.published !== false;
  const order = Number.isInteger(body.order) ? body.order : 0;
  const number = sanitizeString(body.number, 10);

  let id = sanitizeString(body.id, 80).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  if (!id && title) {
    id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  if (!title) {
    return { valid: false, error: 'Project title is required.' };
  }

  if (!description) {
    return { valid: false, error: 'Project description is required.' };
  }

  // Technologies list
  let technologies = [];
  if (Array.isArray(body.technologies)) {
    technologies = body.technologies.map(t => sanitizeString(t, 40)).filter(Boolean);
  } else if (typeof body.technologies === 'string') {
    technologies = body.technologies.split(',').map(t => sanitizeString(t, 40)).filter(Boolean);
  }

  // Features list
  let features = [];
  if (Array.isArray(body.features)) {
    features = body.features.map(f => sanitizeString(f, 200)).filter(Boolean);
  } else if (typeof body.features === 'string') {
    features = body.features.split('\n').map(f => sanitizeString(f, 200)).filter(Boolean);
  }

  return {
    valid: true,
    data: {
      id: id || 'project-' + Date.now(),
      number: number || '000',
      title,
      category,
      status,
      description,
      statusNote,
      technologies,
      githubUrl,
      liveUrl,
      image: image || 'assets/projects/passcheck.jpg',
      illustration,
      problem,
      approach,
      features,
      architecture,
      published,
      order,
      updatedAt: new Date()
    }
  };
}

function validateCertificateInput(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid certificate payload.' };
  }

  const title = sanitizeString(body.title, 150);
  const issuer = sanitizeString(body.issuer, 100);
  const date = sanitizeString(body.date, 30);
  const image = sanitizeString(body.image, 255);
  const verificationUrl = sanitizeString(body.verificationUrl, 255);
  const published = body.published !== false;
  const order = Number.isInteger(body.order) ? body.order : 0;

  let id = sanitizeString(body.id, 80).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  if (!id && title) {
    id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  if (!title) {
    return { valid: false, error: 'Certificate title is required.' };
  }

  if (!issuer) {
    return { valid: false, error: 'Certificate issuer is required.' };
  }

  return {
    valid: true,
    data: {
      id: id || 'cert-' + Date.now(),
      title,
      issuer,
      date: date || String(new Date().getFullYear()),
      image: image || 'assets/certificates/front-end.jpg',
      verificationUrl,
      published,
      order,
      updatedAt: new Date()
    }
  };
}

module.exports = {
  sanitizeString,
  isValidEmail,
  validateEnquiryInput,
  validateFeedbackInput,
  validateProjectInput,
  validateCertificateInput
};

