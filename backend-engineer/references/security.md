# Segurança Backend — OWASP, Auth e Criptografia

## Sumário
1. [OWASP Top 10 + Ataques avançados](#owasp)
2. [Autenticação com JWT](#jwt)
3. [OAuth2 e OpenID Connect](#oauth2)
4. [Autorização baseada em papéis (RBAC)](#rbac)
5. [Criptografia e dados sensíveis](#crypto)
6. [Checklist de segurança completo](#checklist)

---

## 1. OWASP Top 10 e outros vetores {#owasp}

### A1 — SQL Injection
```python
# ❌ NUNCA — concatenação cria injeção
query = f"SELECT * FROM users WHERE email = '{email}'"

# ✅ SEMPRE — queries parametrizadas
query = "SELECT * FROM users WHERE email = $1"
result = await db.fetch(query, email)

# ✅ ORM é seguro por padrão
user = await User.query.filter_by(email=email).first()
```

### A2 — Broken Authentication
```typescript
// ✅ Rate limiting em login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutos
    max: 10,                     // 10 tentativas
    skipSuccessfulRequests: true,
    keyGenerator: (req) => req.body.email || req.ip, // por email, não só IP
    handler: (req, res) => res.status(429).json({
        error: 'too_many_attempts',
        message: 'Muitas tentativas. Tente novamente em 15 minutos.'
    })
});

// ✅ Timing-safe compare para senhas (evitar timing attacks)
const isValid = await bcrypt.compare(inputPassword, storedHash);
// NUNCA: inputPassword === storedHash (timing attack!)
```

### A3 — XSS (Cross-Site Scripting)
```typescript
// ✅ Sanitizar HTML de usuário antes de armazenar
import DOMPurify from 'isomorphic-dompurify';

function sanitizeHtml(input: string): string {
    return DOMPurify.sanitize(input, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p'],
        ALLOWED_ATTR: []
    });
}

// ✅ Headers de segurança (usar helmet.js)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        }
    },
    xssFilter: true,
    noSniff: true,
}));
```

### A4 — Insecure Direct Object Reference (IDOR)
```typescript
// ❌ Vulnerável: user pode acessar ordem de outro usuário
app.get('/orders/:id', async (req, res) => {
    const order = await Order.findById(req.params.id);
    res.json(order);
});

// ✅ Seguro: sempre filtrar pelo usuário autenticado
app.get('/orders/:id', requireAuth, async (req, res) => {
    const order = await Order.findOne({
        id: req.params.id,
        userId: req.user.id  // obrigatório!
    });
    if (!order) return res.status(404).json({ error: 'not_found' });
    res.json(order);
});
```

### A5 — CSRF (Cross-Site Request Forgery)
```typescript
import csrf from 'csurf';

// Para APIs stateful (cookie-based sessions)
app.use(csrf({ cookie: { httpOnly: true, secure: true, sameSite: 'strict' } }));

app.get('/csrf-token', (req, res) => {
    res.json({ token: req.csrfToken() });
});

// Para APIs JWT stateless: CSRF não se aplica — JWT não é enviado automaticamente
// MAS: definir cookie com SameSite=Strict ou Lax para evitar cross-site
```

### A6 — Security Misconfiguration
```typescript
// ✅ Remover informações sensíveis das respostas de erro em produção
if (process.env.NODE_ENV === 'production') {
    app.use((err, req, res, next) => {
        logger.error(err); // Logar internamente com stack trace
        res.status(500).json({
            error: 'internal_error',
            message: 'Erro inesperado'
            // NUNCA expor err.stack em produção!
        });
    });
}

// ✅ Desabilitar headers que revelam stack
app.disable('x-powered-by');
```

### A7 — Mass Assignment
```typescript
// ❌ Vulnerável: aceitar todos os campos do body
async function createUser(body: any) {
    return User.create(body); // usuário pode setar isAdmin=true!
}

// ✅ Seguro: whitelist explícita de campos permitidos
async function createUser(body: CreateUserInput) {
    return User.create({
        name: body.name,
        email: body.email,
        role: 'user', // role sempre definida pelo sistema, não pelo cliente
    });
}
```

### A8 — SSRF (Server-Side Request Forgery)
```typescript
// ❌ Vulnerável: fazer request para URL fornecida pelo usuário
async function fetchExternalData(url: string) {
    return fetch(url); // pode acessar metadados da cloud, serviços internos!
}

// ✅ Validar URL antes de fazer request
import { URL } from 'url';

function isAllowedUrl(urlString: string): boolean {
    try {
        const url = new URL(urlString);
        const blockedHosts = ['169.254.169.254', 'localhost', '127.0.0.1', '0.0.0.0'];
        const blockedRanges = ['10.', '172.16.', '192.168.'];
        
        if (blockedHosts.includes(url.hostname)) return false;
        if (blockedRanges.some(r => url.hostname.startsWith(r))) return false;
        if (!['http:', 'https:'].includes(url.protocol)) return false;
        
        return true;
    } catch { return false; }
}
```

### Ataques de lógica de negócio
```typescript
// Verificar condições de corrida (TOCTOU — Time of Check to Time of Use)
// ❌ Vulnerável a race condition
async function deductBalance(userId: string, amount: number) {
    const user = await User.findById(userId);
    if (user.balance < amount) throw new Error('Saldo insuficiente');
    // Entre o check e o update, outro request pode ter deduzido também!
    await User.update(userId, { balance: user.balance - amount });
}

// ✅ Seguro: operação atômica com constraint no banco
async function deductBalance(userId: string, amount: number) {
    const result = await db.query(`
        UPDATE users
        SET balance = balance - $2
        WHERE id = $1 AND balance >= $2
        RETURNING balance
    `, [userId, amount]);
    
    if (result.rowCount === 0) throw new BusinessError('Saldo insuficiente');
    return result.rows[0].balance;
}
```

---

## 2. Autenticação com JWT {#jwt}

```typescript
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const BCRYPT_ROUNDS = 12; // 2^12 iterações

// Gerar token pair
function generateTokens(userId: string, role: string) {
    const payload = { sub: userId, role };
    
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
        issuer: 'myapp',
        audience: 'myapp-users',
    });
    
    const refreshToken = jwt.sign(
        { sub: userId, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
    
    return { accessToken, refreshToken };
}

// Refresh token rotation — invalida o token usado
async function refreshAccessToken(refreshToken: string) {
    let payload: any;
    try {
        payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
    } catch (err) {
        throw new UnauthorizedError('Token de refresh inválido ou expirado');
    }
    
    // Verificar se token ainda é válido (rotation: invalidar após uso)
    const stored = await redis.get(`refresh:${payload.sub}`);
    if (stored !== refreshToken) {
        // Possível roubo de token — invalidar TODOS os tokens do usuário
        await redis.del(`refresh:${payload.sub}`);
        throw new UnauthorizedError('Token comprometido. Faça login novamente.');
    }
    
    const tokens = generateTokens(payload.sub, payload.role);
    
    // Salvar novo refresh token
    await redis.setEx(
        `refresh:${payload.sub}`,
        7 * 24 * 3600, // 7 dias
        tokens.refreshToken
    );
    
    return tokens;
}

// Middleware de autenticação
async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'unauthorized', message: 'Token não fornecido' });
    }
    
    const token = authHeader.slice(7);
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
        req.user = { id: payload.sub, role: payload.role };
        next();
    } catch (err) {
        const message = err instanceof jwt.TokenExpiredError
            ? 'Token expirado'
            : 'Token inválido';
        res.status(401).json({ error: 'unauthorized', message });
    }
}
```

---

## 3. OAuth2 + OIDC {#oauth2}

```
Fluxos OAuth2:

Authorization Code + PKCE (web apps, mobile):
  1. App gera code_verifier + code_challenge
  2. Redireciona para /authorize?...&code_challenge=...
  3. Usuário autentica no provider
  4. Provider redireciona com code
  5. App troca code por tokens usando code_verifier
  → Use SEMPRE para apps públicos (sem client_secret)

Client Credentials (machine-to-machine):
  POST /token { grant_type: client_credentials, client_id, client_secret }
  → Use para APIs internas se comunicando entre si

Device Code (TV, CLI):
  → Dispositivos sem browser

Implicit Flow: DEPRECIADO — não usar
Resource Owner Password: EVITAR — exceto legado
```

---

## 4. RBAC — Controle de Acesso Baseado em Papéis {#rbac}

```typescript
// Definição de permissões
const permissions = {
    'users:read': ['admin', 'manager', 'user'],
    'users:write': ['admin', 'manager'],
    'users:delete': ['admin'],
    'reports:read': ['admin', 'manager'],
    'billing:manage': ['admin'],
} as const;

// Middleware genérico de autorização
function requirePermission(permission: keyof typeof permissions) {
    return (req: Request, res: Response, next: NextFunction) => {
        const userRole = req.user?.role;
        const allowedRoles = permissions[permission];
        
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                error: 'forbidden',
                message: 'Você não tem permissão para realizar esta ação'
            });
        }
        next();
    };
}

// Uso nas rotas
router.delete('/users/:id',
    requireAuth,
    requirePermission('users:delete'),
    deleteUserHandler
);
```

---

## 5. Criptografia {#crypto}

```typescript
// Hashing de senhas — sempre bcrypt/argon2, nunca MD5/SHA-1
import argon2 from 'argon2';

const hashPassword = (password: string) =>
    argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3 });

const verifyPassword = (hash: string, password: string) =>
    argon2.verify(hash, password);

// Criptografia simétrica para dados sensíveis em repouso
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function encrypt(plaintext: string, key: Buffer): { ciphertext: string; iv: string; tag: string } {
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return {
        ciphertext: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        tag: cipher.getAuthTag().toString('base64'),
    };
}

function decrypt(data: { ciphertext: string; iv: string; tag: string }, key: Buffer): string {
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(data.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(data.tag, 'base64'));
    return Buffer.concat([
        decipher.update(Buffer.from(data.ciphertext, 'base64')),
        decipher.final()
    ]).toString('utf8');
}
```

---

## 6. Checklist de Segurança {#checklist}

### Código
- [ ] Todas as queries usam parâmetros (nunca concatenação)
- [ ] Inputs validados no servidor (nunca confiar no cliente)
- [ ] Outputs sanitizados antes de retornar ao cliente
- [ ] Nenhum dado sensível em logs (senha, token, CPF, cartão)
- [ ] Dependências auditadas (`npm audit` / `pip-audit` / `mvn dependency-check`)

### Autenticação
- [ ] Senhas hashadas com bcrypt/argon2 (custo adequado)
- [ ] Rate limiting no endpoint de login
- [ ] Tokens com expiração curta (access: 15m, refresh: 7d)
- [ ] Refresh token rotation implementada
- [ ] Logout invalida tokens no servidor

### Autorização
- [ ] Toda rota privada tem middleware de autenticação
- [ ] Todo acesso a recurso verifica ownership (userId == req.user.id)
- [ ] RBAC implementado e testado para cada role

### Infraestrutura
- [ ] Secrets em variáveis de ambiente (nunca no código)
- [ ] HTTPS em todos os endpoints
- [ ] Headers de segurança configurados (Helmet ou equivalente)
- [ ] CORS configurado com whitelist (não *)
- [ ] Serviços internos em rede privada (não expostos à internet)
