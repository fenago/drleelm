import Keyv from 'keyv'
import SQLite from '@keyv/sqlite'
import path from 'path'
import fs from 'fs'

// Ensure storage directory exists
const storageDir = path.join(process.cwd(), 'storage')
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true })
}

const dbPath = path.join(storageDir, 'database.sqlite')
const db = new Keyv({
  store: new SQLite({ uri: `sqlite://${dbPath}` })
})

// Log database errors
db.on('error', (err) => console.error('[keyv] Connection Error:', err))

export default db