import Keyv from 'keyv'
import KeyvSqlite from '@keyv/sqlite'
import path from 'path'
import fs from 'fs'

// Ensure storage directory exists
const storageDir = path.join(process.cwd(), 'storage')
if (!fs.existsSync(storageDir)) {
  console.log('[keyv] Creating storage directory:', storageDir)
  fs.mkdirSync(storageDir, { recursive: true })
}

const dbPath = path.join(storageDir, 'database.sqlite')
console.log('[keyv] Database path:', dbPath)

// Create Keyv with SQLite store - pass KeyvSqlite instance directly to Keyv constructor
// Per docs: new Keyv(new KeyvSqlite('sqlite://path'))
const db = new Keyv(new KeyvSqlite(`sqlite://${dbPath}`))

// Log database errors
db.on('error', (err) => console.error('[keyv] Connection Error:', err))

// Test the connection on startup
;(async () => {
  try {
    await db.set('__startup_test__', Date.now())
    const val = await db.get('__startup_test__')
    console.log('[keyv] Database test:', val ? 'PASS' : 'FAIL')
  } catch (e: any) {
    console.error('[keyv] Database test FAILED:', e?.message || e)
  }
})()

export default db