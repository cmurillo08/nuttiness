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

const schemaPath = path.resolve(process.cwd(), 'docs/specs/phase-1-domain.json');
const schema = loadJsonSchemaFile(schemaPath);

const ajv = new Ajv({ coerceTypes: false, removeAdditional: true, allErrors: true });
addFormats(ajv);

// Add the full schema to the Ajv instance so $ref to #/$defs/... resolves.
const rootId = schema.$id || 'phase-1-domain.json';
ajv.addSchema(schema, rootId);

const validators = {
  RawProduct: ajv.compile({ $ref: `${rootId}#/$defs/RawProduct` }),
  PreparedProduct: ajv.compile({ $ref: `${rootId}#/$defs/PreparedProduct` }),
  Expense: ajv.compile({ $ref: `${rootId}#/$defs/Expense` }),
  Sale: ajv.compile({ $ref: `${rootId}#/$defs/Sale` }),
  SaleItem: ajv.compile({ $ref: `${rootId}#/$defs/SaleItem` }),
};

export default validators;
