import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true, strict: false });

function loadJsonSchemaFile(p) {
  const raw = fs.readFileSync(p, 'utf8');
  // the file in docs contains a fenced code block; try to extract JSON
  const match = raw.match(/```json\n([\s\S]*?)\n```/);
  const jsonText = match ? match[1] : raw;
  return JSON.parse(jsonText);
}

const schemaPath = path.join(process.cwd(), 'docs', 'specs', 'phase-1-domain.json');
const schemaDoc = loadJsonSchemaFile(schemaPath);

const defs = schemaDoc.$defs || {};

export const validators = {
  RawProduct: ajv.compile(defs.RawProduct || {}),
  PreparedProduct: ajv.compile(defs.PreparedProduct || {}),
  Expense: ajv.compile(defs.Expense || {}),
  Sale: ajv.compile(defs.Sale || {}),
  SaleItem: ajv.compile(defs.SaleItem || {}),
  SaleCreate: ajv.compile(defs.SaleCreate || {}),
  SaleItemCreate: ajv.compile(defs.SaleItemCreate || {}),
};

export default validators;
