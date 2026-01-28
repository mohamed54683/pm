# Security Considerations

## Document Information
- **Version**: 1.0
- **Last Updated**: 2026-01-28
- **Status**: Approved for Implementation

---

## 1. Security Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEFENSE IN DEPTH                                     │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────────────┐
  │  LAYER 1: PERIMETER SECURITY                                              │
  │  • WAF (Web Application Firewall)                                         │
  │  • DDoS Protection                                                        │
  │  • TLS/SSL Termination                                                    │
  │  • IP Filtering                                                           │
  └───────────────────────────────────────────────────────────────────────────┘
                                      │
  ┌───────────────────────────────────▼───────────────────────────────────────┐
  │  LAYER 2: NETWORK SECURITY                                                │
  │  • VPC/Private Networks                                                   │
  │  • Network Segmentation                                                   │
  │  • Firewall Rules                                                         │
  │  • Intrusion Detection                                                    │
  └───────────────────────────────────────────────────────────────────────────┘
                                      │
  ┌───────────────────────────────────▼───────────────────────────────────────┐
  │  LAYER 3: APPLICATION SECURITY                                            │
  │  • Authentication (JWT, Session, SSO)                                     │
  │  • Authorization (RBAC, ABAC)                                             │
  │  • Input Validation                                                       │
  │  • CSRF/XSS Protection                                                    │
  │  • Rate Limiting                                                          │
  └───────────────────────────────────────────────────────────────────────────┘
                                      │
  ┌───────────────────────────────────▼───────────────────────────────────────┐
  │  LAYER 4: DATA SECURITY                                                   │
  │  • Encryption at Rest (AES-256)                                           │
  │  • Encryption in Transit (TLS 1.3)                                        │
  │  • Data Masking                                                           │
  │  • Row-Level Security                                                     │
  └───────────────────────────────────────────────────────────────────────────┘
                                      │
  ┌───────────────────────────────────▼───────────────────────────────────────┐
  │  LAYER 5: MONITORING & AUDIT                                              │
  │  • Security Event Logging                                                 │
  │  • Anomaly Detection                                                      │
  │  • Audit Trails                                                           │
  │  • Alerting                                                               │
  └───────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication Security

### 2.1 Authentication Methods

| Method | Use Case | Security Level |
|--------|----------|----------------|
| **Local (Password)** | Primary authentication | Medium |
| **SSO (SAML 2.0)** | Enterprise integration | High |
| **OAuth 2.0 / OIDC** | Social login, API access | High |
| **API Keys** | Service-to-service | Medium |
| **MFA (TOTP)** | Enhanced security | Very High |

### 2.2 Password Security

```typescript
// Password Requirements
const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
  preventUserInfoInPassword: true,
  maxConsecutiveChars: 3,
  historyCount: 5, // Prevent reuse of last 5 passwords
  expirationDays: 90 // For enterprise
};

// Password Hashing
const HASHING_CONFIG = {
  algorithm: 'bcrypt',
  rounds: 12, // Cost factor
  pepper: process.env.PASSWORD_PEPPER // Additional secret
};
```

### 2.3 Session Management

```typescript
// Session Configuration
const SESSION_CONFIG = {
  // JWT Settings
  jwt: {
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    algorithm: 'RS256', // Asymmetric for production
    issuer: 'pms.app',
    audience: 'pms-users'
  },

  // Session Settings
  session: {
    absoluteTimeout: '24h',
    idleTimeout: '30m',
    concurrentSessions: 3,
    bindToIP: false, // Can enable for high security
    bindToUserAgent: true
  },

  // Cookie Settings
  cookie: {
    httpOnly: true,
    secure: true, // HTTPS only
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
};
```

### 2.4 Multi-Factor Authentication

| Factor Type | Implementation | Fallback |
|-------------|----------------|----------|
| **TOTP** | Google Authenticator, Authy | Backup codes |
| **SMS** | Twilio, AWS SNS | Email OTP |
| **Email OTP** | Built-in | Security questions |
| **Hardware Key** | WebAuthn/FIDO2 | TOTP |

### 2.5 Account Security

```typescript
// Account Protection
const ACCOUNT_PROTECTION = {
  // Brute Force Protection
  bruteForce: {
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    resetAttemptsAfter: 60 * 60 * 1000 // 1 hour
  },

  // Account Lockout
  lockout: {
    threshold: 10, // Consecutive failures
    duration: 24 * 60 * 60 * 1000, // 24 hours
    notifyAdmin: true
  },

  // Suspicious Activity
  suspiciousActivity: {
    newDeviceLogin: 'notify',
    locationChange: 'notify',
    multipleFailures: 'notify',
    unusualTime: 'log'
  }
};
```

---

## 3. Authorization Security

### 3.1 RBAC Implementation

```typescript
// Permission Check Middleware
async function checkPermission(
  userId: number,
  permission: string,
  resource?: { type: string; id: string }
): Promise<boolean> {
  // 1. Get user roles
  const roles = await getUserRoles(userId);

  // 2. Check system admin bypass
  if (roles.some(r => r.code === 'sys_admin')) return true;

  // 3. Get all permissions from roles
  const permissions = await getRolePermissions(roles);

  // 4. Check direct permission
  if (hasPermission(permissions, permission)) return true;

  // 5. Check resource-specific permission
  if (resource) {
    return await checkResourcePermission(userId, permission, resource);
  }

  return false;
}
```

### 3.2 Row-Level Security

```sql
-- Enable RLS on sensitive tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see projects they're members of
CREATE POLICY project_access ON projects
  FOR SELECT
  USING (
    id IN (
      SELECT project_id FROM project_members WHERE user_id = current_user_id()
    )
    OR
    organization_id = current_org_id() AND current_user_is_admin()
  );
```

### 3.3 API Security

```typescript
// API Security Middleware Stack
const apiSecurityStack = [
  // 1. Rate Limiting
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // requests per window
    keyGenerator: (req) => req.user?.id || req.ip
  }),

  // 2. CORS Configuration
  cors({
    origin: getAllowedOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
  }),

  // 3. Helmet Security Headers
  helmet({
    contentSecurityPolicy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true },
    noSniff: true,
    xssFilter: true
  }),

  // 4. CSRF Protection
  csrfProtection({ cookie: true }),

  // 5. Request Validation
  validateRequest()
];
```

---

## 4. Data Security

### 4.1 Encryption Standards

| Data State | Encryption | Algorithm | Key Management |
|------------|------------|-----------|----------------|
| **At Rest** | Required | AES-256-GCM | AWS KMS / HashiCorp Vault |
| **In Transit** | Required | TLS 1.3 | Certificate Manager |
| **In Memory** | Sensitive data | N/A | Secure memory handling |
| **Backups** | Required | AES-256-GCM | Separate backup keys |

### 4.2 Sensitive Data Classification

| Classification | Examples | Handling |
|----------------|----------|----------|
| **Critical** | Passwords, API keys, tokens | Encrypted, never logged, masked |
| **Confidential** | PII, financial data | Encrypted, access logged |
| **Internal** | Business data, project info | Access controlled |
| **Public** | Marketing, documentation | No restrictions |

### 4.3 Data Masking

```typescript
// Data Masking Rules
const MASKING_RULES = {
  email: (value: string) => {
    const [user, domain] = value.split('@');
    return `${user.charAt(0)}***@${domain}`;
  },
  phone: (value: string) => {
    return value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  },
  creditCard: (value: string) => {
    return `****-****-****-${value.slice(-4)}`;
  },
  ssn: (value: string) => {
    return `***-**-${value.slice(-4)}`;
  }
};
```

### 4.4 Data Retention

| Data Type | Retention Period | Disposal Method |
|-----------|-----------------|-----------------|
| Active user data | Until deletion request | Secure deletion |
| Audit logs | 7 years | Archive then delete |
| Session data | 30 days after logout | Automatic purge |
| Deleted projects | 90 days (soft delete) | Permanent deletion |
| Backups | 90 days | Secure overwrite |

---

## 5. Input Validation & Sanitization

### 5.1 Validation Rules

```typescript
// Input Validation Schema (Zod example)
const taskSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(500, 'Title too long')
    .regex(/^[^<>]*$/, 'Invalid characters'),

  description: z.string()
    .max(10000)
    .transform(sanitizeHtml)
    .optional(),

  priority: z.enum(['low', 'medium', 'high', 'critical']),

  due_date: z.string()
    .datetime()
    .refine(d => new Date(d) > new Date(), 'Date must be future')
    .optional(),

  assignee_ids: z.array(z.number().int().positive())
    .max(10, 'Too many assignees')
    .optional()
});
```

### 5.2 SQL Injection Prevention

```typescript
// NEVER do this:
// const query = `SELECT * FROM users WHERE id = ${userId}`;

// ALWAYS use parameterized queries:
const [users] = await pool.execute(
  'SELECT * FROM users WHERE id = ? AND org_id = ?',
  [userId, orgId]
);

// Or use ORM with built-in protection:
const user = await User.findOne({
  where: { id: userId, organizationId: orgId }
});
```

### 5.3 XSS Prevention

```typescript
// Content Security Policy
const CSP_POLICY = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'"], // Minimize unsafe-inline
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'https:'],
  connectSrc: ["'self'", 'https://api.example.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com'],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  frameSrc: ["'none'"]
};

// HTML Sanitization
import DOMPurify from 'dompurify';

function sanitizeUserInput(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'title'],
    ALLOW_DATA_ATTR: false
  });
}
```

---

## 6. API Security

### 6.1 Rate Limiting

| Endpoint Type | Rate Limit | Window |
|---------------|------------|--------|
| **Authentication** | 5 requests | 15 minutes |
| **Password Reset** | 3 requests | 1 hour |
| **API (Standard)** | 100 requests | 15 minutes |
| **API (Premium)** | 1000 requests | 15 minutes |
| **File Upload** | 10 requests | 1 hour |
| **Search** | 30 requests | 1 minute |

### 6.2 API Authentication

```typescript
// API Key Validation
async function validateApiKey(apiKey: string): Promise<ApiKeyInfo | null> {
  // 1. Check key format
  if (!apiKey.match(/^pms_[a-zA-Z0-9]{32}$/)) {
    return null;
  }

  // 2. Hash and lookup
  const keyHash = hashApiKey(apiKey);
  const keyInfo = await db.apiKeys.findOne({
    where: { key_hash: keyHash, status: 'active' }
  });

  if (!keyInfo) return null;

  // 3. Check expiration
  if (keyInfo.expires_at && new Date(keyInfo.expires_at) < new Date()) {
    return null;
  }

  // 4. Update last used
  await db.apiKeys.update(keyInfo.id, { last_used_at: new Date() });

  return keyInfo;
}
```

### 6.3 Request Signing (Optional)

```typescript
// For high-security integrations
function verifyRequestSignature(req: Request): boolean {
  const signature = req.headers['x-signature'];
  const timestamp = req.headers['x-timestamp'];

  // Check timestamp freshness (5 minute window)
  if (Math.abs(Date.now() - parseInt(timestamp)) > 5 * 60 * 1000) {
    return false;
  }

  // Verify signature
  const payload = `${timestamp}.${JSON.stringify(req.body)}`;
  const expectedSignature = hmac(payload, SECRET_KEY);

  return timingSafeEqual(signature, expectedSignature);
}
```

---

## 7. Infrastructure Security

### 7.1 Network Security

```yaml
# Security Group Rules (AWS Example)
SecurityGroup:
  Name: pms-app-sg
  Ingress:
    - Port: 443
      Source: 0.0.0.0/0
      Description: HTTPS

    - Port: 80
      Source: 0.0.0.0/0
      Description: HTTP (redirect to HTTPS)

  Egress:
    - Port: 443
      Destination: 0.0.0.0/0
      Description: Outbound HTTPS

    - Port: 3306
      Destination: sg-database
      Description: Database access
```

### 7.2 Secret Management

```typescript
// Secret Management Best Practices
const SECRETS_CONFIG = {
  // Use environment variables for local dev
  local: {
    source: '.env.local',
    rotation: 'manual'
  },

  // Use secret manager for production
  production: {
    source: 'AWS Secrets Manager', // or HashiCorp Vault
    rotation: 'automatic',
    rotationInterval: '30d'
  },

  // Never commit secrets
  gitignore: ['.env', '.env.local', '*.pem', '*.key']
};
```

### 7.3 Container Security

```dockerfile
# Secure Dockerfile practices
FROM node:20-alpine AS base

# Don't run as root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Use minimal base image
FROM base AS runner
WORKDIR /app

# Copy only necessary files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

---

## 8. Audit & Compliance

### 8.1 Audit Logging

```typescript
// Audit Log Entry
interface AuditLogEntry {
  id: string;
  timestamp: Date;
  organization_id: string;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: string;
  changes: {
    field: string;
    old_value: any;
    new_value: any;
  }[];
  metadata: {
    ip_address: string;
    user_agent: string;
    session_id: string;
    request_id: string;
  };
}

// Events to audit
const AUDITABLE_ACTIONS = [
  'user.login',
  'user.logout',
  'user.password_change',
  'user.mfa_enable',
  'user.mfa_disable',
  'project.create',
  'project.delete',
  'project.member_add',
  'task.create',
  'task.update',
  'document.upload',
  'document.delete',
  'settings.change',
  'role.assign',
  'permission.change'
];
```

### 8.2 Compliance Requirements

| Standard | Requirements | Implementation |
|----------|--------------|----------------|
| **GDPR** | Data protection, right to deletion | Consent management, data export |
| **SOC 2** | Security, availability, confidentiality | Audit logging, access controls |
| **ISO 27001** | Information security management | Policies, procedures, reviews |
| **HIPAA** | Healthcare data protection | Encryption, audit trails |

### 8.3 Security Monitoring

```typescript
// Security Alerts Configuration
const SECURITY_ALERTS = {
  // Immediate alerts
  critical: [
    'multiple_failed_logins',
    'privilege_escalation_attempt',
    'sql_injection_attempt',
    'unauthorized_data_access'
  ],

  // Daily digest
  warning: [
    'new_device_login',
    'password_reset_request',
    'api_key_created',
    'bulk_data_export'
  ],

  // Weekly review
  info: [
    'permission_changes',
    'user_activity_summary',
    'api_usage_patterns'
  ]
};
```

---

## 9. Security Checklist

### 9.1 Pre-Deployment Checklist

- [ ] All dependencies updated and vulnerability-free
- [ ] Security headers configured (HSTS, CSP, X-Frame-Options)
- [ ] HTTPS enforced, TLS 1.3 enabled
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Input validation on all endpoints
- [ ] SQL injection protection verified
- [ ] XSS protection implemented
- [ ] CSRF tokens enabled
- [ ] Secrets stored securely (not in code)
- [ ] Error messages don't leak sensitive info
- [ ] Audit logging enabled
- [ ] Backup encryption configured
- [ ] Admin accounts use MFA

### 9.2 Ongoing Security Tasks

| Frequency | Task |
|-----------|------|
| **Daily** | Review security alerts |
| **Weekly** | Check for dependency vulnerabilities |
| **Monthly** | Review access logs, permission audits |
| **Quarterly** | Security testing, penetration testing |
| **Annually** | Full security audit, policy review |

---

## 10. Incident Response

### 10.1 Incident Severity Levels

| Level | Definition | Response Time |
|-------|------------|---------------|
| **P1 Critical** | Active breach, data exposure | Immediate (< 15 min) |
| **P2 High** | Security vulnerability discovered | < 1 hour |
| **P3 Medium** | Suspicious activity detected | < 4 hours |
| **P4 Low** | Minor security improvement needed | < 24 hours |

### 10.2 Incident Response Process

```
1. DETECT
   └── Monitoring alerts, user reports, automated scans

2. CONTAIN
   └── Isolate affected systems, revoke compromised credentials

3. INVESTIGATE
   └── Analyze logs, determine scope, identify root cause

4. REMEDIATE
   └── Apply fixes, patch vulnerabilities, restore services

5. COMMUNICATE
   └── Notify stakeholders, users if required, regulators if needed

6. REVIEW
   └── Post-incident analysis, update procedures, document lessons
```

---

## 11. Security Contacts

| Role | Responsibility |
|------|----------------|
| **Security Lead** | Overall security strategy |
| **DevSecOps** | Security automation, tooling |
| **Incident Response** | Security incident handling |
| **Compliance Officer** | Regulatory compliance |
