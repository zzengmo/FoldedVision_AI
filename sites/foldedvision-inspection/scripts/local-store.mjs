import {DatabaseSync} from 'node:sqlite';
import {mkdir,readFile,writeFile,unlink} from 'node:fs/promises';
import path from 'node:path';

export async function localBindings(root,storageRoot=path.join(root,'.runtime')){
  const runtime=path.resolve(storageRoot);
  if(!runtime.startsWith(path.resolve(root)+path.sep))throw new Error('Storage must stay inside the Site workspace');
  await mkdir(path.join(runtime,'uploads'),{recursive:true});
  const db=new DatabaseSync(path.join(runtime,'operations.sqlite'));
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY);');
  const journal=JSON.parse(await readFile(path.join(root,'drizzle/meta/_journal.json'),'utf8'));
  for(const entry of journal.entries){
    if(db.prepare('SELECT name FROM local_migrations WHERE name=?').get(entry.tag))continue;
    const sql=await readFile(path.join(root,'drizzle',entry.tag+'.sql'),'utf8');
    db.exec('BEGIN');try{db.exec(sql.replaceAll('--> statement-breakpoint',''));db.prepare('INSERT INTO local_migrations(name) VALUES (?)').run(entry.tag);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
  }
  function prepared(sql,args=[]){
    return {bind(...next){return prepared(sql,next);},
      async first(){return db.prepare(sql).get(...args)||null;},
      async all(){return {results:db.prepare(sql).all(...args)};},
      async run(){const r=db.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};},
      _execute(){const r=db.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes)}};},
    };
  }
  const DB={prepare:sql=>prepared(sql),async batch(statements){db.exec('BEGIN IMMEDIATE');try{const r=statements.map(s=>s._execute());db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}};
  function filename(key){if(!/^[a-zA-Z0-9_/-]+$/.test(key)||key.includes('..'))throw new Error('Invalid object key');return path.join(runtime,'uploads',key);}
  const BUCKET={
    async put(key,value,options={}){const f=filename(key);await mkdir(path.dirname(f),{recursive:true});await writeFile(f,new Uint8Array(value));await writeFile(f+'.json',JSON.stringify(options.httpMetadata||{}));},
    async get(key){try{const b=await readFile(filename(key));return {body:b,async arrayBuffer(){return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}};}catch(e){if(e.code==='ENOENT')return null;throw e;}},
    async delete(key){for(const f of [filename(key),filename(key)+'.json']){try{await unlink(f);}catch(e){if(e.code!=='ENOENT')throw e;}}},
  };
  return {DB,BUCKET,close:()=>db.close()};
}
