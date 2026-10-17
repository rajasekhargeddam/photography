import { type Db, MongoServerError } from 'mongodb';
import type { Admin, AdminSession, AuthRepository } from './auth';

type Bucket = { _id: string; count: number; expiresAt: Date };
export class MongoAuth implements AuthRepository {
  constructor(private db: Db) {}
  get admins() {
    return this.db.collection<Admin>('admins');
  }
  get sessions() {
    return this.db.collection<AdminSession>('admin_sessions');
  }
  async initialize() {
    await this.admins.createIndex({ email: 1 }, { unique: true });
    await this.sessions.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 },
    );
    await this.db
      .collection('rate_limits')
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  }
  byEmail(email: string) {
    return this.admins.findOne({ email });
  }
  byId(_id: string) {
    return this.admins.findOne({ _id });
  }
  async insertAdmin(admin: Admin) {
    try {
      await this.admins.insertOne(admin);
      return true;
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000)
        return false;
      throw error;
    }
  }
  session(_id: string) {
    return this.sessions.findOne({ _id });
  }
  async saveSession(session: AdminSession) {
    await this.sessions.insertOne(session);
  }
  async deleteSession(_id: string) {
    await this.sessions.deleteOne({ _id });
  }
  async consume(key: string, limit: number, seconds: number) {
    const window = Math.floor(Date.now() / (seconds * 1000));
    const collection = this.db.collection<Bucket>('rate_limits');
    const _id = `${key}:${window}`;
    const update = {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date((window + 2) * seconds * 1000) },
    };
    let record;
    try {
      record = await collection.findOneAndUpdate({ _id }, update, {
        upsert: true,
        returnDocument: 'after',
      });
    } catch (error) {
      if (!(error instanceof MongoServerError) || error.code !== 11000)
        throw error;
      record = await collection.findOneAndUpdate(
        { _id },
        { $inc: { count: 1 } },
        { returnDocument: 'after' },
      );
    }
    return !!record && record.count <= limit;
  }
}
