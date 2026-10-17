import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { ApiFailure, hash } from './enquiries';

export const SESSION_COOKIE = 'studio_session';
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export type Admin = {
  _id: string;
  email: string;
  passwordHash: string;
  active: boolean;
  version: string;
};
export type AdminSession = {
  _id: string;
  adminId: string;
  version: string;
  expiresAt: Date;
};
export interface AuthRepository {
  byEmail(email: string): Promise<Admin | null>;
  byId(id: string): Promise<Admin | null>;
  insertAdmin(admin: Admin): Promise<boolean>;
  session(id: string): Promise<AdminSession | null>;
  saveSession(session: AdminSession): Promise<void>;
  deleteSession(id: string): Promise<void>;
  consume(key: string, limit: number, seconds: number): Promise<boolean>;
}
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, result) => (error ? reject(error) : resolve(result)),
    ),
  );
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await derive(password, salt)).toString('hex')}`;
}
async function verifyPassword(password: string, stored: string) {
  const [salt, digest] = stored.split(':');
  if (
    !/^[a-f0-9]{32}$/.test(salt ?? '') ||
    !/^[a-f0-9]{128}$/.test(digest ?? '')
  )
    return false;
  return timingSafeEqual(
    await derive(password, salt),
    Buffer.from(digest, 'hex'),
  );
}
const emailSchema = z
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());
export async function seedAdmin(
  repo: AuthRepository,
  email: string,
  password: string,
) {
  const normalized = emailSchema.parse(email.trim());
  z.string().min(12).max(128).parse(password);
  if (await repo.byEmail(normalized)) return false;
  return repo.insertAdmin({
    _id: randomUUID(),
    email: normalized,
    passwordHash: await hashPassword(password),
    active: true,
    version: randomUUID(),
  });
}
export class AuthService {
  constructor(private repo: AuthRepository) {}
  async login(input: unknown) {
    const parsed = z
      .object({
        email: z.string().trim().pipe(emailSchema),
        password: z.string().min(1).max(128),
      })
      .strict()
      .safeParse(input);
    if (!parsed.success)
      throw new ApiFailure(401, 'Email or password is incorrect.');
    const { email, password } = parsed.data;
    if (
      !(await this.repo.consume('login:global', 100, 60)) ||
      !(await this.repo.consume(`login:${hash(email)}`, 5, 900))
    )
      throw new ApiFailure(
        429,
        'Too many sign-in attempts. Please try again later.',
      );
    const admin = await this.repo.byEmail(email);
    // Equal-cost password work for unknown accounts; no account enumeration.
    const valid = await verifyPassword(
      password,
      admin?.passwordHash ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`,
    );
    if (!admin?.active || !valid)
      throw new ApiFailure(401, 'Email or password is incorrect.');
    const token = randomBytes(32).toString('hex');
    await this.repo.saveSession({
      _id: hash(token),
      adminId: admin._id,
      version: admin.version,
      expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000),
    });
    return token;
  }
  async current(token?: string) {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const session = await this.repo.session(hash(token));
    if (!session || session.expiresAt.getTime() <= Date.now()) return null;
    const admin = await this.repo.byId(session.adminId);
    return admin?.active && admin.version === session.version
      ? { id: admin._id, email: admin.email }
      : null;
  }
  async logout(token?: string) {
    if (token && /^[a-f0-9]{64}$/.test(token))
      await this.repo.deleteSession(hash(token));
  }
}
