import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { emitKeypressEvents } from 'node:readline';
import { MongoAuth } from '../src/server/mongo-auth';
import { seedAdmin } from '../src/server/auth';

async function passwordPrompt() {
  if (!process.stdin.isTTY)
    throw new Error('Use an interactive terminal to enter the password.');
  process.stdout.write('Password (12–128 characters, hidden): ');
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise<string>((resolve, reject) => {
    let value = '';
    const finish = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.off('keypress', listener);
      process.stdout.write('\n');
    };
    const listener = (text: string, key: { name?: string; ctrl?: boolean }) => {
      if (key.ctrl && key.name === 'c') {
        finish();
        reject(new Error('Cancelled.'));
      } else if (key.name === 'return') {
        finish();
        resolve(value);
      } else if (key.name === 'backspace') value = value.slice(0, -1);
      else if (text && !key.ctrl && !/[\x00-\x1f\x7f]/.test(text))
        value += text;
    };
    process.stdin.on('keypress', listener);
  });
}
async function main() {
  if (!process.env.MONGODB_URI)
    throw new Error('Set MONGODB_URI in .env.local first.');
  const mode = process.argv[2] ?? 'seed';
  if (!['seed', 'disable', 'reset'].includes(mode))
    throw new Error('Use seed, disable or reset.');
  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const email = (await prompt.question('Admin email: ')).trim().toLowerCase();
  prompt.close();
  const client = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  try {
    await client.connect();
    const repo = new MongoAuth(
      client.db(process.env.MONGODB_DATABASE ?? 'photography'),
    );
    await repo.initialize();
    const current = await repo.byEmail(email);
    if (mode === 'disable') {
      if (!current) throw new Error('Account not found.');
      await repo.admins.updateOne(
        { _id: current._id },
        { $set: { active: false, version: randomUUID() } },
      );
      process.stdout.write(
        'Account disabled; existing sessions no longer grant access.\n',
      );
      return;
    }
    if (mode === 'seed' && current) {
      process.stdout.write('Account already exists; no changes made.\n');
      return;
    }
    if (mode === 'reset' && !current) throw new Error('Account not found.');
    const password = await passwordPrompt();
    if (mode === 'seed') {
      process.stdout.write(
        (await seedAdmin(repo, email, password))
          ? 'Admin account created.\n'
          : 'Account already exists; no changes made.\n',
      );
    } else {
      if (password.length < 12 || password.length > 128)
        throw new Error('Password must contain 12–128 characters.');
      const { hashPassword } = await import('../src/server/auth');
      await repo.admins.updateOne(
        { _id: current!._id },
        {
          $set: {
            passwordHash: await hashPassword(password),
            version: randomUUID(),
          },
        },
      );
      process.stdout.write(
        'Password reset; existing sessions no longer grant access. Account active state unchanged.\n',
      );
    }
  } finally {
    await client.close();
  }
}
main().catch(() => {
  process.stderr.write(
    'Account command failed. Check the email, password requirements and database configuration. No credentials were logged.\n',
  );
  process.exitCode = 1;
});
