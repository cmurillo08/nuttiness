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

const validators = {
  RawProduct: ajv.compile({ $ref: `${rootId}#/$defs/RawProduct` }),
  PreparedProduct: ajv.compile({ $ref: `${rootId}#/$defs/PreparedProduct` }),
  Expense: ajv.compile({ $ref: `${rootId}#/$defs/Expense` }),
  Sale: ajv.compile({ $ref: `${rootId}#/$defs/Sale` }),
  SaleItem: ajv.compile({ $ref: `${rootId}#/$defs/SaleItem` }),
  // Request validators
  CreateRawProduct: ajv.compile(CreateRawProductSchema),
  UpdateRawProduct: ajv.compile(UpdateRawProductSchema),
  CreatePreparedProduct: ajv.compile(CreatePreparedProductSchema),
  UpdatePreparedProduct: ajv.compile(UpdatePreparedProductSchema),
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
