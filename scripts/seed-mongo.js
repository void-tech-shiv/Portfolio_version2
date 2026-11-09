/**
 * SAFE DATABASE SEED SCRIPT FOR SHIVANSHU SATYAJEET'S PORTFOLIO
 * 
 * Usage:
 *   MONGODB_URI="your-mongodb-connection-string" node scripts/seed-mongo.js
 *   or with .env file:
 *   node scripts/seed-mongo.js
 *
 * This script seeds the 13 verified projects and 8 certificates from the portfolio.
 * It uses upsert operations with $setOnInsert so that any existing custom fields,
 * modifications, or order changes you make in MongoDB are NEVER overwritten or deleted.
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Try loading local .env if present
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  });
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('ERROR: MONGODB_URI environment variable is not defined.');
  console.error('Please configure MONGODB_URI in your .env file or pass it as an environment variable.');
  process.exit(1);
}

const dbName = process.env.MONGODB_DB_NAME || 'portfolio';

const INITIAL_PROJECTS = [
  {
    id: 'passcheck', number: '001', title: 'PassCheck', category: 'SECURITY', status: 'PUBLISHED DEMO',
    description: 'Privacy-focused password analysis, breach checks and secure password/passphrase generation.',
    statusNote: 'Website deployment is linked in the repository. Public availability and all workflows have not been independently checked.',
    technologies: ['Next.js', 'TypeScript', 'Web Crypto', 'HIBP API'],
    githubUrl: 'https://github.com/void-tech-shiv/PassCheck', liveUrl: 'https://passcheck.shivanshu.in/',
    image: 'assets/projects/passcheck.jpg',
    problem: 'People need useful password feedback without exposing sensitive credentials.',
    approach: 'Implemented browser-side analysis and k-anonymity breach checks.',
    features: ['Password strength and pattern scoring', 'k-anonymous breach exposure lookup', 'Password and passphrase generator'],
    architecture: 'Next.js frontend with local password evaluation and a privacy-preserving breach lookup.',
    published: true, order: 1
  },
  {
    id: 'pdfkit', number: '002', title: 'PDFKit', category: 'SOFTWARE', status: 'PUBLISHED DEMO',
    description: 'Document utility suite for compression, conversion, page operations, annotations and PDF management.',
    statusNote: 'A demo URL is linked. Some document tools use a backend; full production functionality has not been verified.',
    technologies: ['React', 'TypeScript', 'Fastify', 'pdf-lib'],
    githubUrl: 'https://github.com/void-tech-shiv/PDFKit', liveUrl: 'https://pdfkit.shivanshu.in/',
    image: 'assets/projects/pdfkit.jpg',
    problem: 'Everyday document workflows often require multiple disconnected tools.',
    approach: 'Integrated common PDF modifications into a single clean application.',
    features: ['In-browser PDF merge, split and reorder', 'Image to PDF and page-extraction flows', 'Client-focused utilities with backend helpers'],
    architecture: 'React and Fastify application utilizing pdf-lib and Web APIs for local document operations.',
    published: true, order: 2
  },
  {
    id: 'ai-soc', number: '003', title: 'AI-SOC Platform', category: 'SECURITY', status: 'IN DEVELOPMENT',
    description: 'Security operations platform with rule-based detections, alert management and incident correlation.',
    statusNote: 'Core ingestion, detection and correlation phases are documented as complete. AI investigator and advanced dashboard remain planned.',
    technologies: ['Next.js', 'FastAPI', 'Python', 'Neon PostgreSQL'],
    githubUrl: 'https://github.com/void-tech-shiv/AI-SOC',
    image: 'assets/projects/ai-soc.svg', illustration: true,
    problem: 'Security telemetry can overwhelm teams without automated categorization.',
    approach: 'Built a multi-stage pipeline from ingest to correlated incidents.',
    features: ['Rule-based detections and severity scoring', 'Incident grouping across related events', 'Structured alert intake pipeline'],
    architecture: 'FastAPI telemetry ingestion and correlation pipeline writing to Neon PostgreSQL with a Next.js interface.',
    published: true, order: 3
  },
  {
    id: 'glacia', number: '004', title: 'GLACIA', category: 'SOFTWARE', status: 'PROTOTYPE',
    description: 'Alternative Telegram client experiment built in Kotlin for Android using TDLib.',
    statusNote: 'Personal exploration of Android development and Telegram internals. Full protocol parity is not claimed.',
    technologies: ['Kotlin', 'Android', 'TDLib', 'Jetpack Compose'],
    githubUrl: 'https://github.com/void-tech-shiv/GLACIA',
    image: 'assets/projects/glacia.svg', illustration: true,
    problem: 'Official messaging applications offer limited interface personalization.',
    approach: 'Created an experimental Android client targeting the TDLib interface.',
    features: ['Custom dark and light chat themes', 'TDLib chat history, search and message updates', 'Experimental audio calling flow'],
    architecture: 'Jetpack Compose Android app backed by native TDLib bindings and local storage.',
    published: true, order: 4
  },
  {
    id: 'docverify', number: '005', title: 'DocVerify AI', category: 'AI / ML', status: 'PROTOTYPE',
    description: 'Identity-document screening prototype combining OCR, MRZ parsing, tamper analysis and risk scoring.',
    statusNote: 'Research/demo prototype with simulated registry checks; not an official identity-verification product.',
    technologies: ['Python', 'FastAPI', 'React', 'OpenCV'],
    githubUrl: 'https://github.com/void-tech-shiv/Docverify-AI',
    image: 'assets/projects/docverify.svg', illustration: true,
    problem: 'Document tampering is easy to miss when reviews are done manually.',
    approach: 'Built an automated pipeline with visual forensics, text extraction and rule checks.',
    features: ['OCR text and passport MRZ extraction', 'Error level analysis and metadata consistency', 'Aggregated risk score with highlighted flags'],
    architecture: 'FastAPI vision backend with a React review dashboard.',
    published: true, order: 5
  },
  {
    id: 'skilltrack', number: '006', title: 'SkillTrack', category: 'WEB', status: 'PROTOTYPE',
    description: 'Multi-role training and employment analytics application with reporting and dropout-risk modeling.',
    statusNote: 'A demonstration deployment is linked; government adoption or production usage is not claimed.',
    technologies: ['React', 'Express', 'Prisma', 'PostgreSQL'],
    githubUrl: 'https://github.com/void-tech-shiv/Skilltrack', liveUrl: 'https://skilltrack.live/',
    image: 'assets/projects/skilltrack.jpg',
    problem: 'Training programs lack unified visibility into learner retention and placement.',
    approach: 'Connected role-based management dashboards with predictive risk flags.',
    features: ['Candidate, center and administrative roles', 'Batch performance and attendance tracking', 'Early indicators for dropout intervention'],
    architecture: 'React web client communicating with Node/Express APIs and a PostgreSQL database.',
    published: true, order: 6
  },
  {
    id: 'ai-slang', number: '007', title: 'AI Slang Translator', category: 'AI / ML', status: 'IN DEVELOPMENT',
    description: 'Indian slang and tone-aware translator with multilingual chat, voice tools and a mobile client.',
    statusNote: 'Web, API and mobile source are present; deployment, mobile QA and production security work remain.',
    technologies: ['Next.js', 'FastAPI', 'WebSockets', 'React Native'],
    githubUrl: 'https://github.com/void-tech-shiv/AI-slang-translator',
    image: 'assets/projects/ai-slang.svg', illustration: true,
    problem: 'Standard machine translation frequently misses informal regional idioms.',
    approach: 'Engineered prompts and context handling for Indian informal expressions.',
    features: ['Multilingual chat with slang explanations', 'Streaming WebSocket replies and voice tools', 'Shared API powering both web and React Native apps'],
    architecture: 'FastAPI streaming backend, Next.js web application and React Native mobile client.',
    published: true, order: 7
  },
  {
    id: 'klu-bza', number: '008', title: 'KLU BZA Attendance Companion', category: 'WEB', status: 'PROTOTYPE',
    description: 'Unofficial KL University attendance companion built for Flutter web and Android.',
    statusNote: 'Integration preview only. Authenticated ERP login and attendance flows still need student-owner verification; demo records are fictional.',
    technologies: ['Flutter', 'Dart', 'FastAPI', 'Python'],
    githubUrl: 'https://github.com/void-tech-shiv/KLU-BZA-ERP-Portal',
    image: 'assets/projects/klu-bza.svg', illustration: true,
    problem: 'Students need quick insight into attendance margins before missing classes.',
    approach: 'Built cross-platform dashboard calculations on top of academic schedule data.',
    features: ['Current attendance status and required-class math', 'Course timetable breakdown', 'Flutter multi-platform client for web and Android'],
    architecture: 'Flutter interface with FastAPI middleware communicating with academic records.',
    published: true, order: 8
  },
  {
    id: 'leetcode-bot', number: '009', title: 'LeetCode Companion SaaS', category: 'WEB', status: 'IN DEVELOPMENT',
    description: 'Multi-user coding companion prototype with memberships, billing, Telegram tools and an extension.',
    statusNote: 'Repository contains payment and companion flows; end-to-end live billing, admin access and retreat are not verified.',
    technologies: ['Next.js', 'Node.js', 'Prisma', 'Razorpay'],
    githubUrl: 'https://github.com/void-tech-shiv/Leetcode-Agent-Bot',
    image: 'assets/projects/leetcode-bot.svg', illustration: true,
    problem: 'Practicing coding problems often leaves students stuck without structured hints.',
    approach: 'Packaged algorithmic hints, progress tracking and subscription access into one product.',
    features: ['Subscription tiers with payment processing', 'Telegram bot for practice alerts', 'Problem-solving hints without spoiling full solutions'],
    architecture: 'Next.js application with Prisma database access and background Telegram integrations.',
    published: true, order: 9
  },
  {
    id: 'shellforge', number: '010', title: 'ShellForge', category: 'SOFTWARE', status: 'COMPLETED',
    description: 'A Unix-style command shell in C with pipelines, redirection and job controls.',
    statusNote: 'Core command-line implementation and Ubuntu build instructions are documented; no independently verified release binary.',
    technologies: ['C', 'GNU Readline', 'POSIX', 'Make'],
    githubUrl: 'https://github.com/void-tech-shiv/-shellforge-',
    image: 'assets/projects/shellforge.svg', illustration: true,
    problem: 'Learning operating-system concepts benefits from building a real shell.',
    approach: 'Implemented parsing, processes and redirection in C.',
    features: ['Command tokenization, parsing and expansion', 'Pipes, I/O redirection and background jobs', 'History and beginner-friendly command aliases'],
    architecture: 'C command-line implementation using POSIX process APIs and GNU Readline.',
    published: true, order: 10
  },
  {
    id: 'sportspulse', number: '011', title: 'SportsPulse', category: 'SOFTWARE', status: 'COMPLETED',
    description: 'Java sports analytics CLI demonstrating real data-structures and algorithm use cases.',
    statusNote: 'Documented CLI implementation with build/run instructions; hosted web version and complete test coverage are not verified.',
    technologies: ['Java', 'DSA', 'CLI', 'File I/O'],
    githubUrl: 'https://github.com/void-tech-shiv/SPORTSPULSE',
    image: 'assets/projects/sportspulse.svg', illustration: true,
    problem: 'Classroom algorithms can feel disconnected from practical scenarios.',
    approach: 'Mapped search, optimization and randomization algorithms to sports workflows.',
    features: ['Player, team and match records', 'Search, ranking and comparison algorithms', 'Modular CLI and file-based persistence'],
    architecture: 'Modular Java CLI with algorithm, service, model and persistence layers.',
    published: true, order: 11
  },
  {
    id: 'tools-store', number: '012', title: 'Shiv Tools Marketplace', category: 'WEB', status: 'IN DEVELOPMENT',
    description: 'Digital product marketplace for software tools with user accounts, payments and license management.',
    statusNote: 'Payment, admin and license workflows are in the repository; live checkout and production readiness are not confirmed.',
    technologies: ['Next.js', 'PostgreSQL', 'Neon', 'Razorpay'],
    githubUrl: 'https://github.com/void-tech-shiv/shiv-tools-store',
    image: 'assets/projects/tools-store.svg', illustration: true,
    problem: 'Digital tools need customer access, payment handling and license checks.',
    approach: 'Built account, checkout and license management modules.',
    features: ['Product catalog and administrator workflows', 'Payment verification and webhook handling', 'License issue, verification and download management'],
    architecture: 'Next.js application with Neon PostgreSQL and Razorpay order/webhook integrations.',
    published: true, order: 12
  },
  {
    id: 'cybershield', number: '013', title: 'CyberShield', category: 'SECURITY', status: 'PROTOTYPE',
    description: 'Security assessment dashboard that orchestrates OWASP ZAP scans on authorized targets.',
    statusNote: 'Local assessment and lab workflow is documented; no public hosted scanner or independent deployment verification.',
    technologies: ['React', 'FastAPI', 'OWASP ZAP', 'PostgreSQL'],
    githubUrl: 'https://github.com/void-tech-shiv/CyberShield',
    image: 'assets/projects/cybershield.svg', illustration: true,
    problem: 'Security testing needs clear authorization, orchestration and reports.',
    approach: 'Integrated ZAP scanning with separate passive analysis and reporting.',
    features: ['OWASP ZAP-assisted active scanning', 'Passive header, cookie and TLS checks', 'Findings, reports and lab-based testing'],
    architecture: 'React dashboard, Python FastAPI service and local OWASP ZAP container stack.',
    published: true, order: 13
  }
];

const INITIAL_CERTIFICATES = [
  { id: 'fcc-fedl', title: 'Front End Development Libraries', issuer: 'freeCodeCamp', date: '2025', image: 'assets/certificates/front-end.jpg', verificationUrl: 'https://www.freecodecamp.org/certification/shivanshu_satyajeet/front-end-development-libraries', published: true, order: 1 },
  { id: 'fcc-jads', title: 'JavaScript Algorithms and Data Structures', issuer: 'freeCodeCamp', date: '2025', image: 'assets/certificates/js-algo.jpg', verificationUrl: 'https://www.freecodecamp.org/certification/shivanshu_satyajeet/javascript-algorithms-and-data-structures', published: true, order: 2 },
  { id: 'fcc-rwd', title: 'Responsive Web Design', issuer: 'freeCodeCamp', date: '2025', image: 'assets/certificates/rwd.jpg', verificationUrl: 'https://www.freecodecamp.org/certification/shivanshu_satyajeet/responsive-web-design', published: true, order: 3 },
  { id: 'hackerrank-cert', title: 'HackerRank certificate', issuer: 'HackerRank', date: '2025', image: 'assets/certificates/hackerrank.jpg', verificationUrl: 'https://www.hackerrank.com/certificates/588c0e78b0e8', published: true, order: 4 },
  { id: 'skilljar-cert', title: 'Skilljar certificate', issuer: 'Skilljar', date: '2025', image: 'assets/certificates/skilljar.jpg', verificationUrl: 'https://verify.skilljar.com/c/oyko7zrkhybi', published: true, order: 5 },
  { id: 'google-skillshop', title: 'Google Skillshop credential', issuer: 'Google Skillshop', date: '2025', image: 'assets/certificates/google.jpg', verificationUrl: 'https://skillshop.credential.net/f22ab88c-ea65-4f30-9478-0dae22bac3fc', published: true, order: 6 },
  { id: 'simp-eh', title: 'Ethical Hacking 101', issuer: 'Simplilearn SkillUp', date: '2025', image: 'assets/certificates/1764156593426.jpg', published: true, order: 7 },
  { id: 'simp-ai', title: 'AI Agents for Beginners', issuer: 'Simplilearn SkillUp', date: '2025', image: 'assets/certificates/1770051085539.jpg', published: true, order: 8 }
];

async function main() {
  console.log(`Connecting to MongoDB (${dbName})...`);
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);

    console.log('Connected! Creating collections and indexes...');
    await db.collection('admins').createIndex({ email: 1 }, { unique: true });
    await db.collection('sessions').createIndex({ tokenHash: 1 }, { unique: true });
    await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await db.collection('projects').createIndex({ id: 1 }, { unique: true });
    await db.collection('projects').createIndex({ published: 1, order: 1 });
    await db.collection('certificates').createIndex({ id: 1 }, { unique: true });
    await db.collection('certificates').createIndex({ published: 1, order: 1 });
    await db.collection('enquiries').createIndex({ createdAt: -1 });
    await db.collection('enquiries').createIndex({ status: 1 });
    await db.collection('feedback').createIndex({ createdAt: -1 });
    await db.collection('feedback').createIndex({ status: 1 });

    console.log('Seeding projects (safe upsert - preserves existing custom edits)...');
    let projectsInserted = 0;
    for (const proj of INITIAL_PROJECTS) {
      const res = await db.collection('projects').updateOne(
        { id: proj.id },
        {
          $setOnInsert: {
            ...proj,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
      if (res.upsertedCount > 0) projectsInserted++;
    }
    console.log(`✓ Projects: ${projectsInserted} new inserted (out of ${INITIAL_PROJECTS.length} verified projects).`);

    console.log('Seeding certificates (safe upsert)...');
    let certsInserted = 0;
    for (const cert of INITIAL_CERTIFICATES) {
      const res = await db.collection('certificates').updateOne(
        { id: cert.id },
        {
          $setOnInsert: {
            ...cert,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
      if (res.upsertedCount > 0) certsInserted++;
    }
    console.log(`✓ Certificates: ${certsInserted} new inserted (out of ${INITIAL_CERTIFICATES.length} verified credentials).`);

    console.log('\nSeed completed successfully! MongoDB Atlas is ready.');
  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error('Fatal error during seed:', err);
  process.exit(1);
});

