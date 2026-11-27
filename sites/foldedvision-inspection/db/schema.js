import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(), name: text('name').notNull(), email: text('email').notNull(),
  role: text('role').notNull().default('inspector'), createdAt: text('created_at').notNull(),
});
export const config = sqliteTable('app_config', { key: text('key').primaryKey(), value: text('value').notNull() });
export const lots = sqliteTable('lots', {
  id: text('id').primaryKey(), code: text('code').notNull(), scope: text('scope').notNull().default('live'),
  supplier: text('supplier').notNull(), partType: text('part_type').notNull(), partNumber: text('part_number').notNull(),
  quantity: integer('quantity').notNull(), receivedDate: text('received_date').notNull(), note: text('note').notNull().default(''),
  createdBy: text('created_by').notNull(), createdAt: text('created_at').notNull(),
}, t => [uniqueIndex('lots_scope_code').on(t.scope,t.code),index('lots_received').on(t.scope,t.receivedDate)]);
export const inspections = sqliteTable('inspections', {
  id: text('id').primaryKey(), code: text('code').notNull(), lotId: text('lot_id').notNull().references(()=>lots.id),
  itemRef: text('item_ref').notNull(), note: text('note').notNull().default(''),
  aiStatus: text('ai_status').notNull().default('NOT_RUN'), aiType: text('ai_type'), aiScore: real('ai_score'),
  aiModel: text('ai_model'), aiPayload: text('ai_payload'), analysisToken: text('analysis_token'), analysisStartedAt: text('analysis_started_at'), finalStatus: text('final_status').notNull().default('PENDING'),
  finalNote: text('final_note').notNull().default(''), finalType: text('final_type'), decidedBy: text('decided_by'), decidedAt: text('decided_at'),
  revision: integer('revision').notNull().default(0), decisionToken: text('decision_token'),
  createdBy: text('created_by').notNull(), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
}, t => [uniqueIndex('inspection_lot_item').on(t.lotId,t.itemRef),index('inspection_queue').on(t.finalStatus,t.createdAt)]);
export const photos = sqliteTable('photos', {
  id: text('id').primaryKey(), inspectionId: text('inspection_id').notNull().references(()=>inspections.id),
  key: text('object_key').notNull(), name: text('name').notNull(), mime: text('mime').notNull(),
  bytes: integer('bytes').notNull(), createdAt: text('created_at').notNull(),
});
export const audit = sqliteTable('audit', {
  id: text('id').primaryKey(), entityId: text('entity_id').notNull(), scope: text('scope').notNull(),
  action: text('action').notNull(), actorId: text('actor_id').notNull(), actorName: text('actor_name').notNull(),
  detail: text('detail').notNull(), createdAt: text('created_at').notNull(),
}, t => [index('audit_entity').on(t.entityId,t.createdAt)]);
export const scenarios = sqliteTable('scenarios', {
  id: text('id').primaryKey(), name: text('name').notNull(), params: text('params').notNull(),
  result: text('result').notNull(), createdBy: text('created_by').notNull(), createdAt: text('created_at').notNull(),
});
