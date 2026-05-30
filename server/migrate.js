import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const dbSchema = new mongoose.Schema({ data: Object }, { strict: false });
const DbModel = mongoose.model('Database', dbSchema);

async function migrate() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected!');

  console.log('Reading db.json...');
  const data = JSON.parse(fs.readFileSync('./server/db.json', 'utf8'));

  console.log('Writing to MongoDB...');
  let doc = await DbModel.findOne();
  if (!doc) {
    doc = new DbModel();
  }
  doc.data = data;
  doc.markModified('data');
  await doc.save();

  console.log('Migration complete!');
  mongoose.disconnect();
}

migrate().catch(console.error);
