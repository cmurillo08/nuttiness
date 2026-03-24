-- Customer queries

-- SELECT all customers, ordered by created_at DESC
SELECT * FROM customers ORDER BY created_at DESC;

-- SELECT customer by id
SELECT * FROM customers WHERE id = $1;

-- INSERT customer
INSERT INTO customers (name, phone, notes) 
VALUES ($1, $2, $3) 
RETURNING *;

-- UPDATE customer
UPDATE customers 
SET name = $2, phone = $3, notes = $4, updated_at = now() 
WHERE id = $1 
RETURNING *;

-- DELETE customer
DELETE FROM customers WHERE id = $1 RETURNING *;

-- CHECK if customer name exists (for uniqueness validation)
SELECT id FROM customers WHERE name = $1;

-- GET customer count
SELECT COUNT(*) as count FROM customers;
