require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const FormData = require('form-data');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.PRISMA_QUERY_LOG === 'true' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
});
const app = express();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  uploadDir: path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads'),
  uploadMaxMb: Number(process.env.UPLOAD_MAX_MB || 5),
  corsOrigins: (process.env.CORS_ORIGIN || '').split(',').map((x) => x.trim()).filter(Boolean),
  generalRateLimit: Number(process.env.RATE_LIMIT_GENERAL || 300),
  authRateLimit: Number(process.env.RATE_LIMIT_AUTH || 20),
};
const PORT = config.port;
const JWT_SECRET = config.jwtSecret || 'dev-secret-change-me';
const ML_SERVICE_URL = config.mlServiceUrl;
const uploadDir = config.uploadDir;

function validateEnvironment() {
  const errors = [];
  if (!config.databaseUrl) errors.push('DATABASE_URL is required');
  if (config.env === 'production') {
    if (!config.jwtSecret || config.jwtSecret.length < 32) errors.push('JWT_SECRET must be at least 32 characters in production');
    if (config.corsOrigins.length === 0) errors.push('CORS_ORIGIN must be set in production, example: https://app.example.com');
  }
  if (errors.length) {
    console.error('Environment validation failed:\n- ' + errors.join('\n- '));
    process.exit(1);
  }
}
validateEnvironment();

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const allowedImageTypes = new Map([
  ['image/jpeg', ['.jpg', '.jpeg']],
  ['image/png', ['.png']],
  ['image/webp', ['.webp']],
]);
const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, uploadDir),
    filename: (_, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
    },
  }),
  fileFilter: (_, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const validExts = allowedImageTypes.get(file.mimetype);
    const allowed = Boolean(validExts && validExts.includes(ext));
    cb(allowed ? null : new Error('Only JPG, PNG, and WEBP images are allowed'), allowed);
  },
  limits: { fileSize: config.uploadMaxMb * 1024 * 1024 },
});

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});
app.use(helmet({
  crossOriginResourcePolicy: false,
  hsts: config.env === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
}));
app.use(cors({
  credentials: true,
  origin(origin, cb) {
    if (!origin || config.env !== 'production' || config.corsOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS origin denied'));
  },
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
app.use('/uploads', express.static(uploadDir, { maxAge: config.env === 'production' ? '7d' : 0, index: false }));

function simpleRateLimit({ windowMs, max, prefix }) {
  const buckets = new Map();
  return (req, res, next) => {
    const key = `${prefix}:${req.ip}`;
    const now = Date.now();
    const item = buckets.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > item.resetAt) { item.count = 0; item.resetAt = now + windowMs; }
    item.count += 1;
    buckets.set(key, item);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - item.count)));
    if (item.count > max) return res.status(429).json({ message: 'Too many requests. Please try again later.', requestId: req.requestId });
    next();
  };
}
app.use('/api/auth/login', simpleRateLimit({ windowMs: 15 * 60 * 1000, max: config.authRateLimit, prefix: 'auth' }));
app.use('/api', simpleRateLimit({ windowMs: 60 * 1000, max: config.generalRateLimit, prefix: 'api' }));

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const safeUser = (u) => ({ id: u.id, fullName: u.fullName, email: u.email, role: u.role, phone: u.phone, status: u.status, createdAt: u.createdAt });
const tokenFor = (u) => jwt.sign({ id: u.id, role: u.role }, JWT_SECRET, { expiresIn: config.jwtExpiresIn });
const fileUrl = (req, file) => (file ? `${req.protocol}://${req.get('host')}/uploads/${file.filename}` : null);
const toNumber = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : NaN;
};
const todayDate = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
};
const decimalString = (value) => {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return null;
  return n.toFixed(2);
};
const jsonSafe = (value) => JSON.parse(JSON.stringify(value, (_, v) => {
  if (v && typeof v === 'object' && typeof v.toNumber === 'function') return v.toNumber();
  if (typeof v === 'bigint') return Number(v);
  return v;
}));
const monthRange = (q) => {
  const y = Number(q.year) || new Date().getFullYear();
  const m = Number(q.month) ? Number(q.month) - 1 : new Date().getMonth();
  return { start: new Date(y, m, 1), end: new Date(y, m + 1, 1) };
};
const bad = (statusCode, message) => Object.assign(new Error(message), { statusCode });
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (email) => emailRegex.test(String(email || '').toLowerCase());
const isStrongPassword = (password) => String(password || '').length >= 8;
const validDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};
const assertGrade = (grade) => {
  if (!['Q1', 'Q2', 'Q3'].includes(grade)) throw bad(400, 'Grade must be Q1, Q2, or Q3');
};
const optionalGrade = (grade) => {
  const value = String(grade || '').trim().toUpperCase();
  if (!value) return null;
  assertGrade(value);
  return value;
};
const normalizeDateOnly = (value) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  const d = validDate(value);
  if (!d) throw bad(400, 'Valid date is required');
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};
async function getDailyPrice(factoryId, date) {
  if (date) {
    const exact = await prisma.dailyPrice.findFirst({ where: { factoryId, date } });
    if (exact) return exact;
  }
  return prisma.dailyPrice.findFirst({ where: { factoryId }, orderBy: { date: 'desc' } });
}
async function saveDailyPrice({ factoryId, date, q1Price, q2Price, q3Price, createdBy }) {
  const existing = await prisma.dailyPrice.findFirst({ where: { factoryId, date } });
  const data = { q1Price, q2Price, q3Price, createdBy };
  if (existing) return prisma.dailyPrice.update({ where: { id: existing.id }, data });
  return prisma.dailyPrice.create({ data: { factoryId, date, ...data } });
}
async function upsertInventoryWeight(t, factoryId, grade, weightKg) {
  const existing = await t.inventory.findFirst({ where: { factoryId, grade } });
  if (existing) {
    return t.inventory.update({ where: { id: existing.id }, data: { totalWeightKg: { increment: weightKg } } });
  }
  return t.inventory.create({ data: { factoryId, grade, totalWeightKg: weightKg } });
}

async function audit(userId, action, entityType, entityId, oldValue = null, newValue = null) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId: String(entityId || ''),
        oldValue: oldValue ? jsonSafe(oldValue) : undefined,
        newValue: newValue ? jsonSafe(newValue) : undefined,
      },
    });
  } catch (e) {
    console.error('Audit log failed:', e.message);
  }
}
async function notify(userId, title, message, type = 'INFO') {
  if (!userId) return;
  try { await prisma.notification.create({ data: { userId, title, message, type } }); } catch (e) { console.error('Notification failed:', e.message); }
}
async function auth(req, res, next) {
  try {
    const raw = req.headers.authorization || '';
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Authentication token missing' });
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || user.status !== 'ACTIVE') return res.status(401).json({ message: 'Invalid or inactive user' });
    req.user = user;
    next();
  } catch (_) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
const role = (...roles) => (req, res, next) => (roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Unauthorized role' }));

app.get('/', (_, res) => res.json({ message: 'RubberLink API healthy', environment: config.env }));
app.get('/api/health', (_, res) => res.json({ status: 'ok', service: 'backend', timestamp: new Date().toISOString() }));
app.get('/api/ready', asyncHandler(async (_, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: 'ready', database: 'connected', timestamp: new Date().toISOString() });
}));
app.get('/api/meta/workflow', auth, (_, res) => res.json({
  statuses: ['PENDING_OWNER_APPROVAL', 'OWNER_REJECTED', 'PENDING_FACTORY_GRADING', 'TRANSACTION_COMPLETED', 'CANCELLED'],
  flow: ['Tapper submits production', 'Estate owner approves/rejects', 'Approved record enters factory grading queue', 'Factory confirms grade/weight', 'Backend calculates payment and updates inventory'],
}));

app.get('/api/public/landing-stats', asyncHandler(async (_, res) => {
  const today = todayDate();
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const { start, end } = monthRange({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });

  const [
    userRoles,
    productionRecords,
    pendingFactoryGrading,
    completedTransactions,
    todayProcurement,
    monthlyWeight,
    activePriceMatrices,
    latestPrice,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: { role: true } }),
    prisma.productionRecord.count(),
    prisma.productionRecord.count({ where: { status: 'PENDING_FACTORY_GRADING' } }),
    prisma.factoryTransaction.count({ where: { transactionStatus: 'COMPLETED' } }),
    prisma.factoryTransaction.aggregate({
      where: { transactionStatus: 'COMPLETED', completedAt: { gte: today, lt: tomorrow } },
      _sum: { totalPayment: true },
    }),
    prisma.factoryTransaction.aggregate({
      where: { transactionStatus: 'COMPLETED', completedAt: { gte: start, lt: end } },
      _sum: { finalWeightKg: true },
    }),
    prisma.dailyPrice.count({ where: { date: today } }),
    prisma.dailyPrice.findFirst({ where: { date: today }, orderBy: { updatedAt: 'desc' }, include: { factory: { select: { factoryName: true } } } }),
  ]);

  res.json(jsonSafe({
    live: true,
    generatedAt: new Date().toISOString(),
    userRoleCount: userRoles.length,
    userRoles: Object.fromEntries(userRoles.map((x) => [x.role, x._count.role])),
    workflowStateCount: 7,
    qualityGradeCount: 3,
    productionRecords,
    pendingFactoryGrading,
    completedTransactions,
    todayProcurement: todayProcurement._sum.totalPayment || 0,
    monthlyWeight: monthlyWeight._sum.finalWeightKg || 0,
    activePriceMatrices,
    priceMatrixActive: activePriceMatrices > 0,
    latestPrice: latestPrice ? {
      factoryName: latestPrice.factory?.factoryName,
      q1Price: latestPrice.q1Price,
      q2Price: latestPrice.q2Price,
      q3Price: latestPrice.q3Price,
    } : null,
  }));
}));

// Authentication
app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!isValidEmail(email) || !password) throw bad(400, 'Valid email and password are required');
  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) throw bad(401, 'Invalid email or password');
  if (user.status !== 'ACTIVE') throw bad(403, 'Account is inactive');
  await audit(user.id, 'USER_LOGIN', 'User', user.id);
  res.json({ token: tokenFor(user), user: safeUser(user) });
}));
app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const { fullName, email, password, phone } = req.body;
  if (!fullName || !isValidEmail(email) || !isStrongPassword(password)) throw bad(400, 'Full name, valid email, and password with at least 8 characters are required');
  const user = await prisma.user.create({ data: { fullName: String(fullName).trim(), email: String(email).toLowerCase().trim(), phone, passwordHash: await bcrypt.hash(password, 12), role: 'TAPPER' } });
  await audit(user.id, 'USER_REGISTER', 'User', user.id, null, safeUser(user));
  res.status(201).json(safeUser(user));
}));
app.get('/api/auth/me', auth, (req, res) => res.json(safeUser(req.user)));
app.post('/api/auth/logout', auth, asyncHandler(async (req, res) => { await audit(req.user.id, 'USER_LOGOUT', 'User', req.user.id); res.json({ message: 'Logged out' }); }));

// Admin setup and management
app.get('/api/admin/stats', auth, role('ADMIN'), asyncHandler(async (_, res) => {
  const [users, estates, factories, records, transactions, recentActivities] = await Promise.all([
    prisma.user.count(),
    prisma.estate.count(),
    prisma.factory.count(),
    prisma.productionRecord.count(),
    prisma.factoryTransaction.count(),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { user: { select: { fullName: true, email: true } } } }),
  ]);
  res.json({ users, estates, factories, records, transactions, recentActivities });
}));
app.get('/api/admin/users', auth, role('ADMIN'), asyncHandler(async (_, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(users.map(safeUser));
}));
app.post('/api/admin/users', auth, role('ADMIN'), asyncHandler(async (req, res) => {
  const { fullName, email, password, role: roleName, phone, status = 'ACTIVE' } = req.body;
  if (!fullName || !isValidEmail(email) || !isStrongPassword(password) || !roleName) throw bad(400, 'Name, valid email, password with at least 8 characters, and role are required');
  if (!['ADMIN', 'TAPPER', 'ESTATE_OWNER', 'FACTORY_MANAGER'].includes(roleName)) throw bad(400, 'Invalid role');
  const user = await prisma.user.create({ data: { fullName: String(fullName).trim(), email: String(email).toLowerCase().trim(), phone, status, role: roleName, passwordHash: await bcrypt.hash(password, 12) } });
  await audit(req.user.id, 'USER_CREATE', 'User', user.id, null, safeUser(user));
  res.status(201).json(safeUser(user));
}));
app.put('/api/admin/users/:id', auth, role('ADMIN'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const data = { ...req.body };
  if (data.password) { if (!isStrongPassword(data.password)) throw bad(400, 'Password must be at least 8 characters'); data.passwordHash = await bcrypt.hash(data.password, 12); delete data.password; }
  const user = await prisma.user.update({ where: { id }, data });
  await audit(req.user.id, 'USER_UPDATE', 'User', id, null, safeUser(user));
  res.json(safeUser(user));
}));
app.delete('/api/admin/users/:id', auth, role('ADMIN'), asyncHandler(async (req, res) => {
  const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data: { status: 'INACTIVE' } });
  await audit(req.user.id, 'USER_DEACTIVATE', 'User', user.id);
  res.json(safeUser(user));
}));
app.get('/api/admin/estates', auth, role('ADMIN'), asyncHandler(async (_, res) => {
  res.json(await prisma.estate.findMany({ include: { owner: { select: { id: true, fullName: true, email: true } }, assignments: true }, orderBy: { createdAt: 'desc' } }));
}));
app.post('/api/admin/estates', auth, role('ADMIN'), asyncHandler(async (req, res) => {
  const { estateName, location, ownerId } = req.body;
  if (!estateName || !location || !ownerId) throw bad(400, 'Estate name, location, and owner are required');
  const owner = await prisma.user.findFirst({ where: { id: Number(ownerId), role: 'ESTATE_OWNER', status: 'ACTIVE' } });
  if (!owner) throw bad(400, 'Selected owner must be an active estate owner');
  const estate = await prisma.estate.create({ data: { estateName, location, ownerId: owner.id } });
  await audit(req.user.id, 'ESTATE_CREATE', 'Estate', estate.id, null, estate);
  res.status(201).json(estate);
}));
app.get('/api/admin/factories', auth, role('ADMIN'), asyncHandler(async (_, res) => {
  res.json(await prisma.factory.findMany({ include: { manager: { select: { id: true, fullName: true, email: true } } }, orderBy: { createdAt: 'desc' } }));
}));
app.post('/api/admin/factories', auth, role('ADMIN'), asyncHandler(async (req, res) => {
  const { factoryName, location, managerId } = req.body;
  if (!factoryName || !location || !managerId) throw bad(400, 'Factory name, location, and manager are required');
  const manager = await prisma.user.findFirst({ where: { id: Number(managerId), role: 'FACTORY_MANAGER', status: 'ACTIVE' } });
  if (!manager) throw bad(400, 'Selected manager must be an active factory manager');
  const factory = await prisma.factory.create({ data: { factoryName, location, managerId: manager.id } });
  await audit(req.user.id, 'FACTORY_CREATE', 'Factory', factory.id, null, factory);
  res.status(201).json(factory);
}));
app.get('/api/admin/assignments', auth, role('ADMIN'), asyncHandler(async (_, res) => {
  res.json(await prisma.tapperEstateAssignment.findMany({ include: { tapper: { select: { id: true, fullName: true, email: true } }, estate: true }, orderBy: { createdAt: 'desc' } }));
}));
app.post('/api/admin/assignments', auth, role('ADMIN'), asyncHandler(async (req, res) => {
  const { tapperId, estateId, tapperSharePercentage, ownerSharePercentage, startDate } = req.body;
  const tapperShare = toNumber(tapperSharePercentage);
  const ownerShare = toNumber(ownerSharePercentage);
  if (!tapperId || !estateId || !startDate) throw bad(400, 'Tapper, estate, and start date are required');
  if (tapperShare + ownerShare !== 100) throw bad(400, 'Revenue-sharing total must equal 100%');
  const tapper = await prisma.user.findFirst({ where: { id: Number(tapperId), role: 'TAPPER', status: 'ACTIVE' } });
  if (!tapper) throw bad(400, 'Selected user must be an active tapper');
  const existingAssignment = await prisma.tapperEstateAssignment.findFirst({ where: { tapperId: Number(tapperId), estateId: Number(estateId) } });
  const assignment = existingAssignment
    ? await prisma.tapperEstateAssignment.update({ where: { id: existingAssignment.id }, data: { tapperSharePercentage: tapperShare, ownerSharePercentage: ownerShare, startDate: normalizeDateOnly(startDate), status: 'ACTIVE' } })
    : await prisma.tapperEstateAssignment.create({ data: { tapperId: Number(tapperId), estateId: Number(estateId), tapperSharePercentage: tapperShare, ownerSharePercentage: ownerShare, startDate: normalizeDateOnly(startDate) } });
  await audit(req.user.id, 'ASSIGNMENT_UPSERT', 'TapperEstateAssignment', assignment.id, null, assignment);
  res.status(201).json(assignment);
}));
app.get('/api/admin/audit-logs', auth, role('ADMIN'), asyncHandler(async (_, res) => {
  res.json(await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 250, include: { user: { select: { fullName: true, email: true } } } }));
}));

// Tapper production workflow
app.get('/api/tapper/assignments', auth, role('TAPPER'), asyncHandler(async (req, res) => {
  res.json(await prisma.tapperEstateAssignment.findMany({ where: { tapperId: req.user.id, status: 'ACTIVE' }, include: { estate: true } }));
}));
app.get('/api/tapper/dashboard', auth, role('TAPPER'), asyncHandler(async (req, res) => {
  const { start, end } = monthRange(req.query);
  const records = await prisma.productionRecord.findMany({ where: { tapperId: req.user.id, date: { gte: start, lt: end } }, include: { transaction: true }, orderBy: { createdAt: 'desc' } });
  res.json({
    recordsThisMonth: records.length,
    monthlyWeight: records.reduce((s, r) => s + toNumber(r.weightKg), 0),
    finalEarnings: records.reduce((s, r) => s + toNumber(r.transaction?.tapperShareAmount), 0),
    pendingApprovals: records.filter(r => r.status === 'PENDING_OWNER_APPROVAL').length,
    rejected: records.filter(r => r.status === 'OWNER_REJECTED').length,
    recent: records.slice(0, 5),
  });
}));
app.get('/api/tapper/records', auth, role('TAPPER'), asyncHandler(async (req, res) => {
  const where = { tapperId: req.user.id };
  if (req.query.status) where.status = req.query.status;
  res.json(await prisma.productionRecord.findMany({ where, include: { estate: true, mlPredictions: { orderBy: { createdAt: 'desc' }, take: 1 }, transaction: true }, orderBy: { createdAt: 'desc' } }));
}));
app.post('/api/tapper/records', auth, role('TAPPER'), upload.single('image'), asyncHandler(async (req, res) => {
  const { date, estateId, sheetCount, weightKg, remarks } = req.body;
  const tapperExpectedGrade = optionalGrade(req.body.tapperExpectedGrade);
  const recordDate = normalizeDateOnly(date);
  const tomorrow = todayDate(); tomorrow.setDate(tomorrow.getDate() + 1);
  if (recordDate >= tomorrow) throw bad(400, 'Production date cannot be in the future');
  if (!estateId || toNumber(sheetCount) <= 0 || toNumber(weightKg) <= 0) throw bad(400, 'Valid date, estate, sheet count, and weight are required');
  if (!req.file) throw bad(400, 'Rubber sheet image is required');
  const assignment = await prisma.tapperEstateAssignment.findFirst({ where: { tapperId: req.user.id, estateId: Number(estateId), status: 'ACTIVE' }, include: { estate: true } });
  if (!assignment) throw bad(403, 'Tapper is not assigned to this estate');
  const record = await prisma.productionRecord.create({ data: { tapperId: req.user.id, estateId: Number(estateId), date: recordDate, sheetCount: Number(sheetCount), weightKg: Number(weightKg), imageUrl: fileUrl(req, req.file), tapperExpectedGrade, remarks } });
  await notify(assignment.estate.ownerId, 'New production approval needed', `${req.user.fullName} submitted a rubber production record.`, 'INFO');
  await audit(req.user.id, 'PRODUCTION_CREATE', 'ProductionRecord', record.id, null, record);
  res.status(201).json(record);
}));
app.put('/api/tapper/records/:id', auth, role('TAPPER'), upload.single('image'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const old = await prisma.productionRecord.findFirst({ where: { id, tapperId: req.user.id } });
  if (!old) throw bad(404, 'Record not found');
  if (old.locked || !['PENDING_OWNER_APPROVAL', 'OWNER_REJECTED'].includes(old.status)) throw bad(403, 'Only pending or rejected records can be edited');
  const sheetCount = req.body.sheetCount ? Number(req.body.sheetCount) : Number(old.sheetCount);
  const weightKg = req.body.weightKg ? Number(req.body.weightKg) : Number(old.weightKg);
  const tapperExpectedGrade = req.body.tapperExpectedGrade !== undefined ? optionalGrade(req.body.tapperExpectedGrade) : old.tapperExpectedGrade;
  if (sheetCount <= 0 || weightKg <= 0) throw bad(400, 'Sheet count and weight must be greater than 0');
  const record = await prisma.productionRecord.update({
    where: { id },
    data: {
      date: req.body.date ? normalizeDateOnly(req.body.date) : old.date,
      sheetCount,
      weightKg,
      imageUrl: req.file ? fileUrl(req, req.file) : old.imageUrl,
      tapperExpectedGrade,
      remarks: req.body.remarks ?? old.remarks,
      status: 'PENDING_OWNER_APPROVAL',
      ownerApprovalStatus: 'PENDING',
      rejectionReason: null,
      locked: false,
    },
  });
  const assignment = await prisma.tapperEstateAssignment.findFirst({ where: { tapperId: req.user.id, estateId: record.estateId }, include: { estate: true } });
  await notify(assignment?.estate.ownerId, 'Corrected production resubmitted', `${req.user.fullName} updated and resubmitted a production record.`, 'INFO');
  await audit(req.user.id, 'PRODUCTION_UPDATE_RESUBMIT', 'ProductionRecord', id, old, record);
  res.json(record);
}));
app.post('/api/tapper/records/:id/resubmit', auth, role('TAPPER'), asyncHandler(async (req, res) => {
  const old = await prisma.productionRecord.findFirst({ where: { id: Number(req.params.id), tapperId: req.user.id } });
  if (!old) throw bad(404, 'Record not found');
  if (old.status !== 'OWNER_REJECTED') throw bad(400, 'Only rejected records can be resubmitted');
  const record = await prisma.productionRecord.update({ where: { id: old.id }, data: { status: 'PENDING_OWNER_APPROVAL', ownerApprovalStatus: 'PENDING', rejectionReason: null, locked: false } });
  await audit(req.user.id, 'PRODUCTION_RESUBMIT', 'ProductionRecord', record.id, old, record);
  res.json(record);
}));

// Estate owner approval workflow
async function ownerEstateIds(ownerId) {
  return (await prisma.estate.findMany({ where: { ownerId }, select: { id: true } })).map(e => e.id);
}
app.get('/api/owner/dashboard', auth, role('ESTATE_OWNER'), asyncHandler(async (req, res) => {
  const ids = await ownerEstateIds(req.user.id);
  const { start, end } = monthRange(req.query);
  const records = await prisma.productionRecord.findMany({ where: { estateId: { in: ids }, date: { gte: start, lt: end } }, include: { tapper: { select: { fullName: true } }, transaction: true }, orderBy: { createdAt: 'desc' } });
  res.json({
    pendingApprovals: records.filter(r => r.status === 'PENDING_OWNER_APPROVAL').length,
    rejected: records.filter(r => r.status === 'OWNER_REJECTED').length,
    approved: records.filter(r => ['PENDING_FACTORY_GRADING', 'TRANSACTION_COMPLETED'].includes(r.status)).length,
    monthlyYield: records.reduce((s, r) => s + toNumber(r.weightKg), 0),
    ownerShare: records.reduce((s, r) => s + toNumber(r.transaction?.ownerShareAmount), 0),
    recent: records.slice(0, 8),
  });
}));
app.get('/api/owner/records', auth, role('ESTATE_OWNER'), asyncHandler(async (req, res) => {
  const ids = await ownerEstateIds(req.user.id);
  const where = { estateId: { in: ids } };
  if (req.query.status) where.status = req.query.status;
  res.json(await prisma.productionRecord.findMany({ where, include: { tapper: { select: { id: true, fullName: true, email: true } }, estate: true, mlPredictions: { orderBy: { createdAt: 'desc' }, take: 1 }, transaction: true }, orderBy: { createdAt: 'desc' } }));
}));
app.post('/api/owner/records/:id/approve', auth, role('ESTATE_OWNER'), asyncHandler(async (req, res) => {
  const ids = await ownerEstateIds(req.user.id);
  const ownerAssessedGrade = optionalGrade(req.body.ownerAssessedGrade);
  const ownerGradeNotes = String(req.body.ownerGradeNotes || '').trim() || null;
  const old = await prisma.productionRecord.findFirst({ where: { id: Number(req.params.id), estateId: { in: ids } } });
  if (!old) throw bad(404, 'Record not found');
  if (old.status !== 'PENDING_OWNER_APPROVAL') throw bad(400, 'Only pending owner approval records can be approved');
  const record = await prisma.productionRecord.update({ where: { id: old.id }, data: { status: 'PENDING_FACTORY_GRADING', ownerApprovalStatus: 'APPROVED', ownerApprovedBy: req.user.id, ownerApprovedAt: new Date(), locked: true, rejectionReason: null, ownerAssessedGrade, ownerGradeNotes } });
  await notify(old.tapperId, 'Production approved', 'Your production record was approved and sent to the factory queue.', 'SUCCESS');
  await audit(req.user.id, 'OWNER_APPROVAL', 'ProductionRecord', record.id, old, record);
  res.json(record);
}));
app.post('/api/owner/records/:id/reject', auth, role('ESTATE_OWNER'), asyncHandler(async (req, res) => {
  if (!req.body.rejectionReason) throw bad(400, 'Rejection reason is required');
  const ids = await ownerEstateIds(req.user.id);
  const old = await prisma.productionRecord.findFirst({ where: { id: Number(req.params.id), estateId: { in: ids } } });
  if (!old) throw bad(404, 'Record not found');
  if (old.status !== 'PENDING_OWNER_APPROVAL') throw bad(400, 'Only pending owner approval records can be rejected');
  const record = await prisma.productionRecord.update({ where: { id: old.id }, data: { status: 'OWNER_REJECTED', ownerApprovalStatus: 'REJECTED', rejectionReason: req.body.rejectionReason, locked: false } });
  await notify(old.tapperId, 'Production rejected', req.body.rejectionReason, 'WARNING');
  await audit(req.user.id, 'OWNER_REJECTION', 'ProductionRecord', record.id, old, record);
  res.json(record);
}));
app.get('/api/owner/performance', auth, role('ESTATE_OWNER'), asyncHandler(async (req, res) => {
  const ids = await ownerEstateIds(req.user.id);
  const records = await prisma.productionRecord.findMany({ where: { estateId: { in: ids } }, include: { tapper: { select: { fullName: true } }, transaction: true } });
  const grouped = {};
  for (const r of records) {
    const k = r.tapper.fullName;
    grouped[k] ||= { tapper: k, records: 0, weightKg: 0, ownerShare: 0 };
    grouped[k].records += 1;
    grouped[k].weightKg += toNumber(r.weightKg);
    grouped[k].ownerShare += toNumber(r.transaction?.ownerShareAmount);
  }
  res.json(Object.values(grouped));
}));

// Factory workflow
async function managerFactory(managerId) {
  const factory = await prisma.factory.findFirst({ where: { managerId } });
  if (!factory) throw bad(403, 'No factory is assigned to this manager. Admin must create a factory and assign this manager first.');
  return factory;
}
app.get('/api/factory/dashboard', auth, role('FACTORY_MANAGER'), asyncHandler(async (req, res) => {
  const factory = await managerFactory(req.user.id);
  const today = todayDate();
  const { start, end } = monthRange(req.query);
  const [todayPrice, pendingFactoryGrading, tx, inventory] = await Promise.all([
    getDailyPrice(factory.id, today),
    prisma.productionRecord.count({ where: { status: 'PENDING_FACTORY_GRADING', transaction: null } }),
    prisma.factoryTransaction.findMany({ where: { factoryId: factory.id, createdAt: { gte: start, lt: end } }, take: 10, orderBy: { createdAt: 'desc' } }),
    prisma.inventory.findMany({ where: { factoryId: factory.id } }),
  ]);
  res.json({
    factory,
    todayPrice,
    pendingFactoryGrading,
    monthlyPurchaseWeight: tx.reduce((s, t) => s + toNumber(t.finalWeightKg), 0),
    procurementCost: tx.reduce((s, t) => s + toNumber(t.totalPayment), 0),
    inventory,
    recentTransactions: tx,
  });
}));
app.get('/api/factory/prices', auth, role('FACTORY_MANAGER'), asyncHandler(async (req, res) => {
  const factory = await managerFactory(req.user.id);
  res.json(await prisma.dailyPrice.findMany({ where: { factoryId: factory.id }, orderBy: { date: 'desc' } }));
}));
app.post('/api/factory/prices', auth, role('FACTORY_MANAGER'), asyncHandler(async (req, res) => {
  const factory = await managerFactory(req.user.id);
  if (!req.body.date) throw bad(400, 'Date is required');

  const d = normalizeDateOnly(req.body.date);
  const q1 = decimalString(req.body.q1Price ?? req.body.q1);
  const q2 = decimalString(req.body.q2Price ?? req.body.q2);
  const q3 = decimalString(req.body.q3Price ?? req.body.q3);

  if (!q1 || !q2 || !q3 || Number(q1) <= 0 || Number(q2) <= 0 || Number(q3) <= 0) {
    throw bad(400, 'Q1, Q2, and Q3 prices must be valid numbers greater than 0');
  }

  const price = await saveDailyPrice({
    factoryId: factory.id,
    date: d,
    q1Price: q1,
    q2Price: q2,
    q3Price: q3,
    createdBy: req.user.id,
  });

  await audit(req.user.id, 'DAILY_PRICE_UPSERT', 'DailyPrice', price.id, null, price);
  res.status(201).json(price);
}));
app.get('/api/factory/approved-batches', auth, role('FACTORY_MANAGER'), asyncHandler(async (_, res) => {
  res.json(await prisma.productionRecord.findMany({
    where: { status: 'PENDING_FACTORY_GRADING', transaction: null },
    include: { tapper: { select: { fullName: true, email: true } }, estate: true, mlPredictions: { orderBy: { createdAt: 'desc' }, take: 1 }, transaction: true },
    orderBy: { createdAt: 'desc' },
  }));
}));
app.post('/api/factory/records/:id/predict', auth, role('FACTORY_MANAGER'), upload.single('image'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const record = await prisma.productionRecord.findUnique({ where: { id }, include: { transaction: true } });
  if (!record || record.transaction || record.status !== 'PENDING_FACTORY_GRADING') throw bad(404, 'Only owner-approved, not-completed records can be graded');

  let imagePath = req.file?.path;
  let savedImageUrl = req.file ? fileUrl(req, req.file) : record.imageUrl;

  if (!imagePath && record.imageUrl) {
    const filename = path.basename(record.imageUrl);
    const candidate = path.join(uploadDir, filename);
    if (fs.existsSync(candidate)) {
      imagePath = candidate;
    }
  }

  if (!imagePath) throw bad(400, 'Image is required for ML prediction. Please upload an image or ensure the batch has an image.');
  let ml;
  try {
    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath));
    ml = (await axios.post(`${ML_SERVICE_URL}/predict`, form, { headers: form.getHeaders(), timeout: 15000 })).data;
  } catch (_) {
    ml = {
      predicted_grade: null,
      confidence_score: 0,
      model_version: 'unavailable',
      low_confidence: true,
      mode: 'manual_fallback',
      warning: 'ML service unavailable. Manual grading is required.',
      error: 'ML service unavailable. Manual grading is required.',
      transparency: {
        final_decision_rule: 'ML failed. Factory manager must manually inspect and select Q1, Q2, or Q3.',
        confidence_threshold_percent: 70,
        decision_trace: ['Image received by backend', 'ML service unavailable', 'Manual factory verification required'],
        grade_definitions: { Q1: 'Premium sheet: clean, well dried, uniform and low defect level', Q2: 'Medium sheet: acceptable sheet with minor visible defects', Q3: 'Low sheet: visible contamination, poor drying, damage, or inconsistent quality' },
      },
    };
  }
  let saved = null;
  if (ml.predicted_grade && ['Q1', 'Q2', 'Q3'].includes(ml.predicted_grade)) {
    saved = await prisma.mLPrediction.create({ data: { productionRecordId: id, imageUrl: savedImageUrl || record.imageUrl || '', predictedGrade: ml.predicted_grade, confidenceScore: toNumber(ml.confidence_score), modelVersion: ml.model_version || 'unknown', predictionType: 'FACTORY_FINAL_GRADING', isLowConfidence: Boolean(ml.low_confidence) } });
  }
  await prisma.productionRecord.update({ where: { id }, data: { status: 'PENDING_FACTORY_GRADING' } });
  await audit(req.user.id, 'ML_PREDICTION_REQUEST', 'ProductionRecord', id, null, ml);
  res.json({ prediction: saved, mlResponse: ml });
}));
app.post('/api/factory/records/:id/complete-transaction', auth, role('FACTORY_MANAGER'), asyncHandler(async (req, res) => {
  const factory = await managerFactory(req.user.id);
  const id = Number(req.params.id);
  const finalWeightKg = toNumber(req.body.finalWeightKg);
  const finalGrade = req.body.finalGrade;
  const overrideReason = String(req.body.overrideReason || '').trim();
  const inspectorNotes = String(req.body.inspectorNotes || '').trim();
  const gradingChecklist = req.body.gradingChecklist && typeof req.body.gradingChecklist === 'object' ? req.body.gradingChecklist : {};
  const checkedItems = Object.entries(gradingChecklist).filter(([, value]) => Boolean(value)).map(([key]) => key);
  assertGrade(finalGrade);
  if (finalWeightKg <= 0) throw bad(400, 'Final weight must be greater than 0');

  const record = await prisma.productionRecord.findUnique({ where: { id }, include: { estate: true, mlPredictions: { orderBy: { createdAt: 'desc' }, take: 1 }, transaction: true } });
  if (!record || record.transaction || record.status !== 'PENDING_FACTORY_GRADING') throw bad(400, 'Record is not ready or already completed');

  const today = todayDate();
  const price = await getDailyPrice(factory.id, today);
  if (!price) throw bad(400, 'Today\'s daily price is not configured. Add Q1/Q2/Q3 prices first.');

  const assignment = await prisma.tapperEstateAssignment.findFirst({ where: { tapperId: record.tapperId, estateId: record.estateId, status: 'ACTIVE' } });
  if (!assignment) throw bad(400, 'Revenue-sharing assignment is missing for this tapper and estate');

  const pricePerKg = { Q1: toNumber(price.q1Price), Q2: toNumber(price.q2Price), Q3: toNumber(price.q3Price) }[finalGrade];
  const latestMl = record.mlPredictions[0];
  const gradeOverridden = Boolean(latestMl && latestMl.predictedGrade !== finalGrade);
  const manualOnly = !latestMl;
  const lowConfidence = Boolean(latestMl?.isLowConfidence);
  if (checkedItems.length < 3) throw bad(400, 'Complete at least 3 grading checklist items before completing the transaction');
  if (gradeOverridden && !overrideReason) throw bad(400, 'Override reason is required when final grade differs from ML suggestion');
  if ((manualOnly || lowConfidence) && inspectorNotes.length < 10) throw bad(400, 'Inspector notes are required for manual or low-confidence grading');
  const gradingDecisionSource = manualOnly ? 'MANUAL_ONLY' : gradeOverridden ? 'ML_OVERRIDDEN_BY_FACTORY' : lowConfidence ? 'ML_LOW_CONFIDENCE_CONFIRMED_BY_FACTORY' : 'ML_CONFIRMED_BY_FACTORY';

  const totalPayment = finalWeightKg * pricePerKg;
  const tapperSharePercentage = toNumber(assignment.tapperSharePercentage);
  const ownerSharePercentage = toNumber(assignment.ownerSharePercentage);
  const tapperShareAmount = totalPayment * tapperSharePercentage / 100;
  const ownerShareAmount = totalPayment * ownerSharePercentage / 100;

  const transaction = await prisma.$transaction(async (t) => {
    const created = await t.factoryTransaction.create({ data: { productionRecordId: id, factoryId: factory.id, factoryManagerId: req.user.id, finalWeightKg, mlSuggestedGrade: latestMl?.predictedGrade || null, mlConfidenceScore: latestMl ? toNumber(latestMl.confidenceScore) : null, finalGrade, pricePerKg, totalPayment, tapperSharePercentage, ownerSharePercentage, tapperShareAmount, ownerShareAmount, gradeOverridden, overrideReason: gradeOverridden ? overrideReason : null, inspectorNotes: inspectorNotes || null, gradingChecklist, gradingDecisionSource, transactionStatus: 'COMPLETED', completedAt: new Date() } });
    await t.productionRecord.update({ where: { id }, data: { status: 'TRANSACTION_COMPLETED', locked: true } });
    await upsertInventoryWeight(t, factory.id, finalGrade, finalWeightKg);
    return created;
  });
  await notify(record.tapperId, 'Transaction completed', `Final grade: ${finalGrade}. ML grade: ${latestMl?.predictedGrade || 'Manual only'}. Tapper share: Rs. ${tapperShareAmount.toFixed(2)}`, 'SUCCESS');
  await notify(record.estate.ownerId, 'Transaction completed', `Final grade: ${finalGrade}. ML grade: ${latestMl?.predictedGrade || 'Manual only'}. Owner share: Rs. ${ownerShareAmount.toFixed(2)}`, 'SUCCESS');
  await audit(req.user.id, 'TRANSACTION_COMPLETION', 'FactoryTransaction', transaction.id, null, { ...transaction, gradingChecklist, gradingDecisionSource });
  res.status(201).json(transaction);
}));
app.get('/api/factory/inventory', auth, role('FACTORY_MANAGER'), asyncHandler(async (req, res) => {
  const factory = await managerFactory(req.user.id);
  res.json(await prisma.inventory.findMany({ where: { factoryId: factory.id }, orderBy: { grade: 'asc' } }));
}));
app.get('/api/factory/overrides', auth, role('FACTORY_MANAGER'), asyncHandler(async (req, res) => {
  const factory = await managerFactory(req.user.id);
  res.json(await prisma.factoryTransaction.findMany({ where: { factoryId: factory.id, gradeOverridden: true }, include: { productionRecord: { include: { estate: true, tapper: { select: { fullName: true } } } } }, orderBy: { createdAt: 'desc' } }));
}));

// Notifications and reports
app.get('/api/notifications', auth, asyncHandler(async (req, res) => {
  res.json(await prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 50 }));
}));
app.patch('/api/notifications/:id/read', auth, asyncHandler(async (req, res) => {
  const notification = await prisma.notification.findFirst({ where: { id: Number(req.params.id), userId: req.user.id } });
  if (!notification) throw bad(404, 'Notification not found');
  res.json(await prisma.notification.update({ where: { id: notification.id }, data: { isRead: true } }));
}));
function sendExcel(res, rows, name) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Report');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${name}.xlsx`);
  res.send(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}
function sendPdf(res, rows, title) {
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${title}.pdf`);
  doc.pipe(res);
  doc.fontSize(18).text(title.replaceAll('_', ' ').toUpperCase());
  doc.moveDown();
  rows.forEach((r, i) => doc.fontSize(9).text(`${i + 1}. ${JSON.stringify(r)}`));
  doc.end();
}
app.get('/api/reports/tapper', auth, asyncHandler(async (req, res) => {
  const { start, end } = monthRange(req.query);
  const tapperId = req.user.role === 'TAPPER' ? req.user.id : Number(req.query.tapperId || req.user.id);
  if (req.user.role !== 'TAPPER' && req.user.role !== 'ADMIN') throw bad(403, 'Unauthorized report access');
  const records = await prisma.productionRecord.findMany({ where: { tapperId, date: { gte: start, lt: end } }, include: { estate: true, transaction: true, mlPredictions: { orderBy: { createdAt: 'desc' }, take: 1 } }, orderBy: { date: 'desc' } });
  const rows = records.map(r => ({ id: r.id, date: r.date.toISOString().slice(0, 10), estate: r.estate.estateName, status: r.status, sheetCount: r.sheetCount, weightKg: toNumber(r.weightKg), tapperExpectedGrade: r.tapperExpectedGrade || '-', ownerAssessedGrade: r.ownerAssessedGrade || '-', mlGrade: r.transaction?.mlSuggestedGrade || r.mlPredictions[0]?.predictedGrade || '-', mlConfidence: toNumber(r.transaction?.mlConfidenceScore ?? r.mlPredictions[0]?.confidenceScore), finalGrade: r.transaction?.finalGrade || '-', decisionSource: r.transaction?.gradingDecisionSource || '-', overrideReason: r.transaction?.overrideReason || '-', totalPayment: toNumber(r.transaction?.totalPayment), tapperShare: toNumber(r.transaction?.tapperShareAmount) }));
  await audit(req.user.id, 'REPORT_EXPORT', 'TapperReport', tapperId);
  if (req.query.format === 'excel') return sendExcel(res, rows, 'tapper_report');
  if (req.query.format === 'pdf') return sendPdf(res, rows, 'tapper_report');
  res.json({ totalRecords: rows.length, totalWeight: rows.reduce((s, r) => s + r.weightKg, 0), totalTapperShare: rows.reduce((s, r) => s + r.tapperShare, 0), rows });
}));
app.get('/api/reports/estate', auth, asyncHandler(async (req, res) => {
  const { start, end } = monthRange(req.query);
  let estateFilter = {};
  if (req.user.role === 'ESTATE_OWNER') estateFilter = { estateId: { in: await ownerEstateIds(req.user.id) } };
  if (!['ESTATE_OWNER', 'ADMIN'].includes(req.user.role)) throw bad(403, 'Unauthorized report access');
  const records = await prisma.productionRecord.findMany({ where: { ...estateFilter, date: { gte: start, lt: end } }, include: { estate: true, tapper: true, transaction: true, mlPredictions: { orderBy: { createdAt: 'desc' }, take: 1 } }, orderBy: { date: 'desc' } });
  const rows = records.map(r => ({ id: r.id, date: r.date.toISOString().slice(0, 10), estate: r.estate.estateName, tapper: r.tapper.fullName, status: r.status, weightKg: toNumber(r.weightKg), tapperExpectedGrade: r.tapperExpectedGrade || '-', ownerAssessedGrade: r.ownerAssessedGrade || '-', mlGrade: r.transaction?.mlSuggestedGrade || r.mlPredictions[0]?.predictedGrade || '-', mlConfidence: toNumber(r.transaction?.mlConfidenceScore ?? r.mlPredictions[0]?.confidenceScore), finalGrade: r.transaction?.finalGrade || '-', decisionSource: r.transaction?.gradingDecisionSource || '-', overrideReason: r.transaction?.overrideReason || '-', ownerShare: toNumber(r.transaction?.ownerShareAmount) }));
  if (req.query.format === 'excel') return sendExcel(res, rows, 'estate_report');
  if (req.query.format === 'pdf') return sendPdf(res, rows, 'estate_report');
  res.json({ totalRecords: rows.length, totalWeight: rows.reduce((s, r) => s + r.weightKg, 0), totalOwnerShare: rows.reduce((s, r) => s + r.ownerShare, 0), rows });
}));
app.get('/api/reports/factory', auth, asyncHandler(async (req, res) => {
  const { start, end } = monthRange(req.query);
  if (!['FACTORY_MANAGER', 'ADMIN'].includes(req.user.role)) throw bad(403, 'Unauthorized report access');
  const where = { createdAt: { gte: start, lt: end } };
  if (req.user.role === 'FACTORY_MANAGER') where.factoryId = (await managerFactory(req.user.id)).id;
  const tx = await prisma.factoryTransaction.findMany({ where, include: { factory: true, productionRecord: { include: { estate: true, tapper: true } } }, orderBy: { createdAt: 'desc' } });
  const rows = tx.map(t => ({ id: t.id, date: t.createdAt.toISOString().slice(0, 10), factory: t.factory.factoryName, estate: t.productionRecord.estate.estateName, tapper: t.productionRecord.tapper.fullName, finalGrade: t.finalGrade, weightKg: toNumber(t.finalWeightKg), pricePerKg: toNumber(t.pricePerKg), totalPayment: toNumber(t.totalPayment), overridden: t.gradeOverridden }));
  if (req.query.format === 'excel') return sendExcel(res, rows, 'factory_report');
  if (req.query.format === 'pdf') return sendPdf(res, rows, 'factory_report');
  res.json({ totalTransactions: rows.length, totalWeight: rows.reduce((s, r) => s + r.weightKg, 0), procurementCost: rows.reduce((s, r) => s + r.totalPayment, 0), rows });
}));

app.use((req, res) => res.status(404).json({ message: 'Route not found', requestId: req.requestId }));
app.use((err, req, res, next) => {
  let status = err instanceof multer.MulterError ? 400 : err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'PrismaClientValidationError') {
    status = 400;
    message = 'Invalid database request. Run npx prisma generate and npx prisma migrate dev, then retry.';
  }
  if (err.code === 'P2002') {
    status = 409;
    message = 'Duplicate record. This item already exists.';
  }
  if (err.code === 'P2025') {
    status = 404;
    message = 'Requested record was not found.';
  }

  const payload = { message: status >= 500 ? 'Internal server error' : message, requestId: req.requestId };
  if (config.env !== 'production' && status >= 500) payload.debug = err.message;
  console.error(JSON.stringify({ level: 'error', requestId: req.requestId, status, message: err.message, code: err.code, stack: config.env === 'production' ? undefined : err.stack }));
  res.status(status).json(payload);
});

const server = app.listen(PORT, () => console.log(`RubberLink backend running on http://localhost:${PORT}`));
async function shutdown(signal) {
  console.log(`${signal} received. Closing backend gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
