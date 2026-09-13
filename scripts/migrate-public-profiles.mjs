import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { applicationDefault, initializeApp, deleteApp } from 'firebase-admin/app';
import { FieldPath, getFirestore } from 'firebase-admin/firestore';

export async function migratePublicProfiles(db, { apply = false, pageSize = 200 } = {}) {
  const counts = { scanned: 0, created: 0, wouldCreate: 0, existing: 0, invalid: 0 };
  let last;
  while (true) {
    let query = db.collection('PROFILES').orderBy(FieldPath.documentId()).limit(pageSize);
    if (last) query = query.startAfter(last);
    const page = await query.get();
    if (page.empty) break;
    for (const legacy of page.docs) {
      counts.scanned++;
      const data = legacy.data();
      const steamNickname = typeof data.steamNickname === 'string' ? data.steamNickname.trim() : '';
      const kakaoNickname = typeof data.kakaoNickname === 'string' ? data.kakaoNickname.trim() : '';
      if (steamNickname.length > 64 || kakaoNickname.length > 64) {
        counts.invalid++;
        continue;
      }
      const target = db.collection('PUBLIC_PROFILES').doc(legacy.id);
      const outcome = await db.runTransaction(async (transaction) => {
        const current = await transaction.get(target);
        if (current.exists) {
          const value = current.data();
          const allowed = ['id', 'steamNickname', 'kakaoNickname'];
          const valid = Object.keys(value).length === allowed.length
            && Object.keys(value).every((key) => allowed.includes(key))
            && value.id === legacy.id
            && ['steamNickname', 'kakaoNickname'].every((key) =>
              typeof value[key] === 'string' && value[key].length <= 64
              && (value[key] === '' || value[key].trim().length > 0));
          return valid ? 'existing' : 'invalid';
        }
        if (!apply) return 'wouldCreate';
        // Allowlist fields; never copy the legacy document with a spread.
        transaction.create(target, { id: legacy.id, steamNickname, kakaoNickname });
        return 'created';
      });
      counts[outcome]++;
    }
    last = page.docs.at(-1);
  }
  return counts;
}

async function main() {
  const { values } = parseArgs({ options: { project: { type: 'string' }, apply: { type: 'boolean', default: false } } });
  if (!values.project) throw new Error('An explicit --project PROJECT_ID is required. Dry-run is the default.');
  const emulator = process.env.FIRESTORE_EMULATOR_HOST;
  if (emulator && (!/^(127\.0\.0\.1|localhost):\d+$/.test(emulator) || !values.project.startsWith('demo-'))) {
    throw new Error('Emulator migrations must use localhost and a demo- project.');
  }
  const app = initializeApp({ projectId: values.project, ...(emulator ? {} : { credential: applicationDefault() }) });
  try {
    const result = await migratePublicProfiles(getFirestore(app), { apply: values.apply });
    // Do not log names, nicknames, emails, tokens, or complete documents.
    console.log(JSON.stringify({ project: values.project, mode: values.apply ? 'apply' : 'dry-run', ...result }));
    if (result.invalid > 0) process.exitCode = 1;
  } finally {
    await deleteApp(app);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Migration failed.');
    process.exitCode = 1;
  });
}
