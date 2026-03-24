import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

function loadJsonSchemaFile(p) {
  const raw = fs.readFileSync(p, 'utf8');
  const match = raw.match(/```json\n([\s\S]*?)\n```/);
  const jsonText = match ? match[1] : raw;
  return JSON.parse(jsonText);
}

const ajv = new Ajv({ coerceTypes: false, removeAdditional: true, allErrors: true });
addFormats(ajv);

// Load Phase 1 canonical schema (JSON file) and register under its $id
const phase1Path = path.resolve(process.cwd(), 'docs/specs/phase-1-domain.json');
let rootId = 'phase-1-domain.json';
let phase1 = null;
if (fs.existsSync(phase1Path)) {
  phase1 = loadJsonSchemaFile(phase1Path);
  rootId = phase1.$id || rootId;
  ajv.addSchema(phase1, rootId);
} else {
  throw new Error('Phase 1 domain schema not found: docs/specs/phase-1-domain.json')
}

// Helper to clone a definition but remove properties from required (e.g. id, created_at)
function makeRequestSchema(def, removeRequired = []) {
  const req = Array.isArray(def.required) ? def.required.filter(r => !removeRequired.includes(r)) : [];
  return {
    type: 'object',
    properties: def.properties || {},
    required: req,
    additionalProperties: def.additionalProperties === undefined ? false : def.additionalProperties,
  };
}

// Build create/update schemas that do not require `id` or server timestamps
const RawDef = phase1.$defs && phase1.$defs.RawProduct;
const PreparedDef = phase1.$defs && phase1.$defs.PreparedProduct;

const CreateRawProductSchema = makeRequestSchema(RawDef, ['id', 'created_at', 'updated_at']);
const UpdateRawProductSchema = makeRequestSchema(RawDef, ['id', 'created_at', 'updated_at']);
const CreatePreparedProductSchema = makeRequestSchema(PreparedDef, ['id', 'created_at', 'updated_at']);
const UpdatePreparedProductSchema = makeRequestSchema(PreparedDef, ['id', 'created_at', 'updated_at']);

// Define a focused Expense schema (Phase-3): single-row expense entity
const ExpenseDef = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    purchased_at: { type: 'string', format: 'date-time' },
    raw_product_id: { anyOf: [{ type: 'string', format: 'uuid' }, { type: 'null' }] },
    quantity: { type: 'number', exclusiveMinimum: 0 },
    cost: { type: 'number', minimum: 0 },
    notes: { type: ['string', 'null'] },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  required: ['purchased_at', 'quantity', 'cost'],
  additionalProperties: false,
};

const CreateExpenseSchema = makeRequestSchema(ExpenseDef, ['id', 'created_at', 'updated_at']);
const UpdateExpenseSchema = makeRequestSchema(ExpenseDef, ['id', 'created_at', 'updated_at']);

// Define Sale and SaleItem request schemas (no id, timestamps, or totals required)
const CreateSaleItemSchema = {
  type: 'object',
  properties: {
    prepared_product_id: { anyOf: [{ type: 'string', format: 'uuid' }, { type: 'null' }] },
    quantity: { type: 'number', exclusiveMinimum: 0 },
    unit_price: { type: 'number', minimum: 0 }
  },
  required: ['quantity', 'unit_price'],
  additionalProperties: false,
};

const CreateSaleSchema = {
  type: 'object',
  properties: {
    customer_id: { type: 'string', format: 'uuid' },
    status: { type: 'string', enum: ['prepared', 'delivered', 'paid', 'cancelled'] },
    lines: { type: 'array', items: CreateSaleItemSchema }
  },
  required: ['customer_id', 'lines'],
  additionalProperties: false,
};

// Define Customer schemas (Phase-5)
const CustomerDef = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', minLength: 1, maxLength: 255 },
    phone: { anyOf: [{ type: 'string', maxLength: 20 }, { type: 'null' }] },
    notes: { anyOf: [{ type: 'string', maxLength: 5000 }, { type: 'null' }] },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  required: ['id', 'name', 'created_at', 'updated_at'],
  additionalProperties: false,
};

const CreateCustomerSchema = makeRequestSchema(CustomerDef, ['id', 'created_at', 'updated_at']);
const UpdateCustomerSchema = makeRequestSchema(CustomerDef, ['id', 'created_at', 'updated_at']);

const validators = {
  RawProduct: ajv.compile({ $ref: `${rootId}#/$defs/RawProduct` }),
  PreparedProduct: ajv.compile({ $ref: `${rootId}#/$defs/PreparedProduct` }),
  // Use explicit Expense schema to enforce Phase-3 rules
  Expense: ajv.compile(ExpenseDef),
  CreateExpense: ajv.compile(CreateExpenseSchema),
  UpdateExpense: ajv.compile(UpdateExpenseSchema),
  Sale: ajv.compile({ $ref: `${rootId}#/$defs/Sale` }),
  SaleItem: ajv.compile({ $ref: `${rootId}#/$defs/SaleItem` }),
  // Request validators
  CreateRawProduct: ajv.compile(CreateRawProductSchema),
  UpdateRawProduct: ajv.compile(UpdateRawProductSchema),
  CreatePreparedProduct: ajv.compile(CreatePreparedProductSchema),
  UpdatePreparedProduct: ajv.compile(UpdatePreparedProductSchema),
  CreateSale: ajv.compile(CreateSaleSchema),
  SaleCreate: ajv.compile(CreateSaleSchema),
  SaleItemCreate: ajv.compile(CreateSaleItemSchema),
  CreateCustomer: ajv.compile(CreateCustomerSchema),
  UpdateCustomer: ajv.compile(UpdateCustomerSchema),
  // utility: format AJV errors into compact objects and include a top-level summary entry
  formatErrors: (errs) => {
    if (!errs) return [];
    const list = [{ instancePath: '', message: `${errs.length} validation error(s)`, keyword: 'validation', params: {}, schemaPath: '' }];
    for (const e of errs) {
      list.push({ instancePath: e.instancePath || '', message: e.message || '', keyword: e.keyword || '', params: e.params || {}, schemaPath: e.schemaPath || '' });
    }
    return list;
  }
};

export default validators;
