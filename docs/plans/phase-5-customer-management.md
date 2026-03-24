# Phase 5: Customer Management

## Overview
Add a Customer entity to track customers in the system. This allows for better order management, enabling customers to be selected when creating sales orders instead of free-form text entry.

## Objectives
1. Create a new `Customer` entity with CRUD operations
2. Link customers to sales orders
3. Update the OrderBuilder UI to select customers from a managed list
4. Display customer count on the dashboard

## Scope

### Included
- Customer entity (name, contact info)
- Customer CRUD API routes
- Customer selection dropdown in OrderBuilder
- Customer count card on dashboard
- Database migration for customers table

### NOT Included
- Customer groups or categories
- Customer credit/payment history
- Customer reporting/analytics
- Customer import/export

## Domain Model

### Customer Entity
```
- id: UUID (primary key)
- name: string (required, unique)
- phone: string (optional)
- notes: string (optional)
- created_at: timestamp
- updated_at: timestamp
```

### Changes to Sales Order
- Add `customer_id` (foreign key to Customer)
- Keep `customer_name` for backward compatibility or deprecate after migration

## Backend Design

### API Routes
- `GET /api/customers` — List all customers
- `POST /api/customers` — Create new customer
- `GET /api/customers/:id` — Get customer details
- `PUT /api/customers/:id` — Update customer
- `DELETE /api/customers/:id` — Delete customer

### Database
- New table: `customers`
- Modify `sales` table: add optional `customer_id` (FK)

## Frontend Design

### Pages/Components
- New page: `/customers` — List customers
- New page: `/customers/new` — Create customer form
- New page: `/customers/:id` — Edit customer
- New component: `CustomerSelect` — Dropdown to select customer for orders
- Update: `OrderBuilder` — Replace text input with CustomerSelect
- Update: Dashboard — Add customers count card

### User Flow
1. User creates a new order
2. Selects a customer from the dropdown (existing or create inline)
3. Adds products and submits order
4. Sale is linked to the selected customer

## Acceptance Criteria
- [ ] Customer CRUD API routes functional
- [ ] Database migration applied successfully
- [ ] CustomerSelect component renders customer list
- [ ] OrderBuilder uses CustomerSelect instead of text input
- [ ] Dashboard displays customer count
- [ ] All existing sales functionality still works
- [ ] Customer-specific tests pass

## Notes
- This is an extension of Phase 4 (Sales)
- Maintain backward compatibility where possible
- Consider data migration for existing orders if changing sales.customer_name behavior
