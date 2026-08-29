import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const time = '2026-01-01T00:00:00.000Z';
const schema = `
CREATE TABLE knowledge (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '[]', scope TEXT NOT NULL DEFAULT 'global', normalized_title TEXT NOT NULL, content_hash TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(normalized_title, scope), UNIQUE(content_hash, scope));
CREATE VIRTUAL TABLE knowledge_fts USING fts5(title, content, tags, content='knowledge', content_rowid='rowid', tokenize='porter unicode61');
CREATE TRIGGER knowledge_ai AFTER INSERT ON knowledge BEGIN INSERT INTO knowledge_fts(rowid,title,content,tags) VALUES(NEW.rowid,NEW.title,NEW.content,NEW.tags); END;
CREATE TRIGGER knowledge_ad AFTER DELETE ON knowledge BEGIN INSERT INTO knowledge_fts(knowledge_fts,rowid,title,content,tags) VALUES('delete',OLD.rowid,OLD.title,OLD.content,OLD.tags); END;
CREATE TRIGGER knowledge_au AFTER UPDATE ON knowledge BEGIN INSERT INTO knowledge_fts(knowledge_fts,rowid,title,content,tags) VALUES('delete',OLD.rowid,OLD.title,OLD.content,OLD.tags); INSERT INTO knowledge_fts(rowid,title,content,tags) VALUES(NEW.rowid,NEW.title,NEW.content,NEW.tags); END;
CREATE INDEX idx_knowledge_scope ON knowledge(scope); PRAGMA user_version=1;`;

export function createFixtureProject(memories, extraConfig = {}) {
  const projectDir = mkdtempSync(join(tmpdir(), 'agent-memory-bench-'));
  const dbPath = join(projectDir, 'memory.db');
  const db = new Database(dbPath);
  db.exec(schema);
  const insert = db.prepare('INSERT INTO knowledge (id,title,content,tags,scope,normalized_title,content_hash,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)');
  const seed = db.transaction(() => {
    for (const memory of memories) insert.run(
      memory.id, memory.title.trim(), memory.content.trim(), JSON.stringify([...(new Set((memory.tags ?? []).map(tag => tag.toLowerCase().trim()).filter(Boolean)))]),
      (memory.scope ?? 'global').trim().toLowerCase(), memory.title.toLowerCase().trim().replace(/\s+/g, ' '),
      createHash('sha256').update(memory.content.trim().replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n')).digest('hex'), time, time,
    );
  });
  seed(); db.pragma('wal_checkpoint(TRUNCATE)'); db.close();
  writeFileSync(join(projectDir, '.ai-devkit.json'), JSON.stringify({ version: '0.56.0', environments: [], phases: [], memory: { path: dbPath }, ...extraConfig }, null, 2));
  return { projectDir, dbPath, close: () => rmSync(projectDir, { recursive: true, force: true }) };
}
