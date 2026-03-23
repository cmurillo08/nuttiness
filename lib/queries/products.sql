-- SQL snippets for products/raw-products used by backend handlers
-- List prepared products with pagination
-- SELECT * FROM prepared_products ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- Get prepared product by id
-- SELECT * FROM prepared_products WHERE id = $1;

-- Insert prepared product (example template)
-- INSERT INTO prepared_products (name, price, unit, cost_price, recipe_notes, created_at, updated_at)
-- VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;

-- Update prepared product (example template)
-- UPDATE prepared_products SET name=$2, price=$3, unit=$4, cost_price=$5, recipe_notes=$6, updated_at=$7 WHERE id=$1 RETURNING *;

-- Analogous queries exist for raw_products
