# MySQL Guide

## 1. SQL Joins

### Explanation
Joins combine rows from two or more tables based on a related column. Different join types determine which rows are included in the result.

### Key Concepts
- **INNER JOIN**: Only matching rows from both tables
- **LEFT JOIN**: All rows from left table + matching from right (NULL if no match)
- **RIGHT JOIN**: All rows from right table + matching from left
- **FULL OUTER JOIN**: All rows from both tables
- **CROSS JOIN**: Cartesian product (every combination)

### Real-Time Example
**Company & Employees**: INNER JOIN = employees with departments. LEFT JOIN = all employees, even without department. CROSS JOIN = every employee with every department (rarely useful).

### Code Block
```sql
-- Sample Tables
CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100)
);

CREATE TABLE orders (
  id INT PRIMARY KEY,
  user_id INT,
  amount DECIMAL(10,2),
  created_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 1. INNER JOIN (only users who have orders)
SELECT 
  users.id,
  users.name,
  orders.id AS order_id,
  orders.amount
FROM users
INNER JOIN orders ON users.id = orders.user_id;

/*
Result:
+----+-------+----------+--------+
| id | name  | order_id | amount |
+----+-------+----------+--------+
| 1  | Alice | 101      | 99.99  |
| 1  | Alice | 102      | 49.99  |
| 2  | Bob   | 103      | 199.99 |
+----+-------+----------+--------+
*/

-- 2. LEFT JOIN (all users, even without orders)
SELECT 
  users.id,
  users.name,
  orders.id AS order_id,
  orders.amount
FROM users
LEFT JOIN orders ON users.id = orders.user_id;

/*
Result:
+----+-------+----------+--------+
| id | name  | order_id | amount |
+----+-------+----------+--------+
| 1  | Alice | 101      | 99.99  |
| 1  | Alice | 102      | 49.99  |
| 2  | Bob   | 103      | 199.99 |
| 3  | Carol | NULL     | NULL   |  <- No orders
+----+-------+----------+--------+
*/

-- 3. RIGHT JOIN (all orders, even if user deleted)
SELECT 
  users.name,
  orders.id AS order_id,
  orders.amount
FROM users
RIGHT JOIN orders ON users.id = orders.user_id;

-- 4. Find users WITHOUT orders (using LEFT JOIN)
SELECT users.id, users.name
FROM users
LEFT JOIN orders ON users.id = orders.user_id
WHERE orders.id IS NULL;

-- 5. Self JOIN (employees and their managers)
CREATE TABLE employees (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  manager_id INT
);

SELECT 
  e.name AS employee,
  m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;

-- 6. Multiple JOINs
SELECT 
  users.name,
  orders.id AS order_id,
  products.name AS product_name,
  order_items.quantity
FROM users
INNER JOIN orders ON users.id = orders.user_id
INNER JOIN order_items ON orders.id = order_items.order_id
INNER JOIN products ON order_items.product_id = products.id;

-- 7. Real Interview Example: E-commerce Analytics
-- Find top 5 customers by total spending, with order count

SELECT 
  u.id,
  u.name,
  u.email,
  COUNT(o.id) AS order_count,
  SUM(o.amount) AS total_spent,
  AVG(o.amount) AS avg_order_value
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
GROUP BY u.id, u.name, u.email
HAVING total_spent > 1000
ORDER BY total_spent DESC
LIMIT 5;

-- 8. JOIN with Aggregation
-- Products with category names and sales count

SELECT 
  p.id,
  p.name,
  c.name AS category,
  COUNT(oi.id) AS times_sold,
  SUM(oi.quantity) AS total_quantity
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name, c.name
ORDER BY times_sold DESC;
```

---

## 2. Transactions (ACID)

### Explanation
A transaction is a sequence of operations performed as a single logical unit of work. Either all operations succeed (COMMIT) or all fail (ROLLBACK), ensuring data integrity.

### Key Concepts
- **Atomicity**: All or nothing
- **Consistency**: Database goes from one valid state to another
- **Isolation**: Concurrent transactions don't interfere
- **Durability**: Committed changes persist even after system failure

### Real-Time Example
**Bank Transfer**: Transfer $100 from Account A to Account B. Both debit and credit must succeed together, or neither happens. Can't have money disappear!

### Code Block
```sql
-- 1. Basic Transaction
START TRANSACTION;

UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

COMMIT;  -- Both updates succeed

-- 2. Transaction with Rollback
START TRANSACTION;

UPDATE accounts SET balance = balance - 100 WHERE id = 1;

-- Check if sender has sufficient balance
SELECT balance FROM accounts WHERE id = 1;
-- If balance < 0, ROLLBACK

ROLLBACK;  -- Undo all changes

-- 3. Real Interview Example: E-commerce Order Creation
START TRANSACTION;

-- 1. Create order
INSERT INTO orders (user_id, total, status, created_at)
VALUES (123, 299.99, 'pending', NOW());

SET @order_id = LAST_INSERT_ID();

-- 2. Add order items
INSERT INTO order_items (order_id, product_id, quantity, price)
VALUES 
  (@order_id, 1, 2, 99.99),
  (@order_id, 5, 1, 99.99);

-- 3. Update product inventory
UPDATE products 
SET stock = stock - 2 
WHERE id = 1 AND stock >= 2;

-- Check if update affected rows (sufficient stock)
-- If ROW_COUNT() = 0, ROLLBACK

UPDATE products 
SET stock = stock - 1 
WHERE id = 5 AND stock >= 1;

-- 4. Deduct user wallet balance
UPDATE users 
SET wallet_balance = wallet_balance - 299.99 
WHERE id = 123 AND wallet_balance >= 299.99;

-- If all succeeded
COMMIT;

-- If any failed
-- ROLLBACK;

-- 4. Savepoints (partial rollback)
START TRANSACTION;

UPDATE accounts SET balance = balance - 50 WHERE id = 1;
SAVEPOINT sp1;

UPDATE accounts SET balance = balance + 50 WHERE id = 2;
SAVEPOINT sp2;

UPDATE accounts SET balance = balance + 100 WHERE id = 3;

-- Oops, mistake in last update
ROLLBACK TO SAVEPOINT sp2;  -- Undo only last update

COMMIT;

-- 5. ACID Demonstration

-- Atomicity: All or nothing
START TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- Power failure here → Both rollback automatically
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;

-- Consistency: Constraints enforced
START TRANSACTION;
INSERT INTO orders (user_id, total) VALUES (999, 100);  -- Foreign key violation
-- Transaction fails, database remains consistent
COMMIT;

-- Isolation: See next section

-- Durability: After COMMIT, data persists
START TRANSACTION;
INSERT INTO logs (message) VALUES ('Important event');
COMMIT;
-- Even if server crashes now, data is safe

-- 6. Deadlock Example
-- Session 1
START TRANSACTION;
UPDATE accounts SET balance = balance - 10 WHERE id = 1;
-- Waiting for lock on id=2...
UPDATE accounts SET balance = balance + 10 WHERE id = 2;

-- Session 2 (simultaneously)
START TRANSACTION;
UPDATE accounts SET balance = balance - 10 WHERE id = 2;
-- Waiting for lock on id=1...
UPDATE accounts SET balance = balance + 10 WHERE id = 1;

-- Deadlock! MySQL detects and rolls back one transaction

-- 7. Preventing Deadlocks
-- Always acquire locks in same order
START TRANSACTION;
SELECT * FROM accounts WHERE id IN (1, 2) ORDER BY id FOR UPDATE;  -- Lock in order
UPDATE accounts SET balance = balance - 10 WHERE id = 1;
UPDATE accounts SET balance = balance + 10 WHERE id = 2;
COMMIT;
```

---

## 3. Normalization

### Explanation
Normalization is organizing database tables to reduce redundancy and dependency. Data is divided into related tables with relationships.

### Key Concepts
- **1NF**: Atomic values, no repeating groups
- **2NF**: 1NF + No partial dependencies
- **3NF**: 2NF + No transitive dependencies
- **Trade-off**: Less redundancy vs more JOINs

### Real-Time Example
**Student Courses**: Instead of repeating student info for each course, separate students table and courses table, link with enrollment table.

### Code Block
```sql
-- Unnormalized (❌ Bad)
CREATE TABLE student_courses (
  student_id INT,
  student_name VARCHAR(100),
  student_email VARCHAR(100),
  student_address VARCHAR(200),
  course1 VARCHAR(100),
  course2 VARCHAR(100),
  course3 VARCHAR(100)
);

/*
Problems:
- Repeating groups (course1, course2, course3)
- Update anomaly (change student email → update multiple rows)
- Deletion anomaly (delete last course → lose student info)
- Insertion anomaly (can't add student without course)
*/

-- 1NF: Atomic values, no repeating groups
CREATE TABLE student_courses_1nf (
  student_id INT,
  student_name VARCHAR(100),
  student_email VARCHAR(100),
  student_address VARCHAR(200),
  course_name VARCHAR(100),
  PRIMARY KEY (student_id, course_name)
);

/*
+------------+--------------+-------------------+---------+-------------+
| student_id | student_name | student_email     | address | course_name |
+------------+--------------+-------------------+---------+-------------+
| 1          | Alice        | alice@example.com | NYC     | Math        |
| 1          | Alice        | alice@example.com | NYC     | Physics     |
| 2          | Bob          | bob@example.com   | LA      | Math        |
+------------+--------------+-------------------+---------+-------------+

Problem: Student data repeated (redundancy)
*/

-- 2NF: 1NF + No partial dependencies
-- Separate student and course data

CREATE TABLE students (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100),
  address VARCHAR(200)
);

CREATE TABLE courses (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  credits INT
);

CREATE TABLE enrollments (
  student_id INT,
  course_id INT,
  grade VARCHAR(2),
  enrolled_at DATE,
  PRIMARY KEY (student_id, course_id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

/*
students:
+----+-------+-------------------+---------+
| id | name  | email             | address |
+----+-------+-------------------+---------+
| 1  | Alice | alice@example.com | NYC     |
| 2  | Bob   | bob@example.com   | LA      |
+----+-------+-------------------+---------+

enrollments:
+------------+-----------+-------+-------------+
| student_id | course_id | grade | enrolled_at |
+------------+-----------+-------+-------------+
| 1          | 101       | A     | 2024-01-15  |
| 1          | 102       | B+    | 2024-01-15  |
+------------+-----------+-------+-------------+
*/

-- 3NF: 2NF + No transitive dependencies

-- Before 3NF (transitive dependency)
CREATE TABLE employees_2nf (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  department_id INT,
  department_name VARCHAR(100),  -- Depends on department_id, not id!
  department_location VARCHAR(100)
);

-- After 3NF
CREATE TABLE employees (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  department_id INT,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE departments (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  location VARCHAR(100)
);

-- 4. Real Interview Example: E-commerce Normalization

-- Unnormalized
CREATE TABLE orders_bad (
  order_id INT,
  customer_name VARCHAR(100),
  customer_email VARCHAR(100),
  product1_name VARCHAR(100),
  product1_price DECIMAL(10,2),
  product2_name VARCHAR(100),
  product2_price DECIMAL(10,2)
);

-- Normalized (3NF)
CREATE TABLE customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE
);

CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100),
  price DECIMAL(10,2),
  description TEXT
);

CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT,
  total DECIMAL(10,2),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT,
  product_id INT,
  quantity INT,
  price DECIMAL(10,2),  -- Snapshot of price at order time
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 5. When to Denormalize (intentional redundancy)

-- Add calculated columns for performance
ALTER TABLE orders 
ADD COLUMN item_count INT,
ADD COLUMN total_amount DECIMAL(10,2);

-- Update with triggers
DELIMITER //
CREATE TRIGGER update_order_totals 
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
  UPDATE orders 
  SET 
    item_count = (SELECT SUM(quantity) FROM order_items WHERE order_id = NEW.order_id),
    total_amount = (SELECT SUM(quantity * price) FROM order_items WHERE order_id = NEW.order_id)
  WHERE id = NEW.order_id;
END//
DELIMITER ;

-- Trade-off: Faster reads (no JOIN/SUM), slower writes (trigger overhead)
```

---

## 4. Indexes

### Explanation
Indexes are data structures (B+tree) that improve query performance by allowing fast lookups. They speed up SELECT queries but slow down INSERT/UPDATE/DELETE.

### Key Concepts
- **B+tree**: Sorted tree structure (O(log n) lookups)
- **Clustered Index**: Primary key, determines physical order
- **Secondary Index**: Additional indexes on other columns
- **Composite Index**: Multiple columns (order matters!)

### Real-Time Example
**Phone Book**: Finding "Smith" is fast because it's alphabetically sorted (indexed by name). Finding by phone number is slow (no index).

### Code Block
```sql
-- 1. Create Index
CREATE INDEX idx_email ON users(email);

-- 2. Unique Index
CREATE UNIQUE INDEX idx_email_unique ON users(email);

-- 3. Composite Index (order matters!)
CREATE INDEX idx_name_age ON users(last_name, first_name, age);

-- Queries that use this index:
SELECT * FROM users WHERE last_name = 'Smith';  -- ✅ Uses index
SELECT * FROM users WHERE last_name = 'Smith' AND first_name = 'John';  -- ✅ Uses index
SELECT * FROM users WHERE last_name = 'Smith' AND age = 30;  -- ✅ Uses index

-- Query that does NOT use index:
SELECT * FROM users WHERE first_name = 'John';  -- ❌ Can't use index (missing leading column)
SELECT * FROM users WHERE age = 30;  -- ❌ Can't use index

-- 4. Show Indexes
SHOW INDEXES FROM users;

-- 5. Analyze Query Performance
EXPLAIN SELECT * FROM users WHERE email = 'john@example.com';

/*
+----+-------------+-------+------+---------------+-----------+
| id | select_type | table | type | possible_keys | key       |
+----+-------------+-------+------+---------------+-----------+
| 1  | SIMPLE      | users | ref  | idx_email     | idx_email |
+----+-------------+-------+------+---------------+-----------+

type: 
- const: Single row (best)
- ref: Index lookup (good)
- range: Index range scan
- index: Full index scan
- ALL: Full table scan (worst)
*/

-- 6. Covering Index (query only uses indexed columns)
CREATE INDEX idx_user_info ON users(id, name, email);

SELECT id, name, email FROM users WHERE id = 100;
-- MySQL doesn't need to access table data, just the index!

-- 7. Real Interview Example: Optimize Slow Query

-- Slow query (no index)
SELECT * FROM orders 
WHERE customer_id = 123 
  AND status = 'pending' 
  AND created_at >= '2024-01-01'
ORDER BY created_at DESC;

-- Check with EXPLAIN
EXPLAIN SELECT ...;
-- type: ALL (table scan) ❌

-- Create composite index
CREATE INDEX idx_customer_status_date 
ON orders(customer_id, status, created_at);

-- Now EXPLAIN shows:
-- type: ref (index lookup) ✅
-- Uses index for WHERE and ORDER BY

-- 8. Index Best Practices

/*
Create indexes on:
1. Primary keys (automatic)
2. Foreign keys
3. Columns in WHERE clauses
4. Columns in ORDER BY
5. Columns in JOIN conditions

Composite index column order:
1. Equality filters (=) first
2. Sort columns next
3. Range filters (>, <, BETWEEN) last

Example: WHERE status = 'active' AND age > 25 ORDER BY created_at
Index: (status, created_at, age)
*/

-- 9. Index Overhead

-- Without index
INSERT INTO users (name, email) VALUES ('John', 'john@example.com');
-- Time: 5ms

-- With 5 indexes
INSERT INTO users (name, email) VALUES ('John', 'john@example.com');
-- Time: 15ms (updates 5 B+trees)

-- 10. Drop Unused Indexes
-- Find unused indexes (MySQL 8.0+)
SELECT 
  s.table_name,
  s.index_name,
  s.index_type
FROM information_schema.statistics s
LEFT JOIN sys.schema_unused_indexes u 
  ON s.table_schema = u.object_schema 
  AND s.table_name = u.object_name 
  AND s.index_name = u.index_name
WHERE u.index_name IS NOT NULL;

DROP INDEX idx_unused ON users;
```

---

## 5. Isolation Levels

### Explanation
Isolation levels control how transaction changes are visible to other concurrent transactions. Higher isolation = more protection but less concurrency.

### Key Concepts
- **READ UNCOMMITTED**: Dirty reads possible
- **READ COMMITTED**: No dirty reads
- **REPEATABLE READ**: No dirty/non-repeatable reads (MySQL default)
- **SERIALIZABLE**: Full isolation, transactions run serially

### Real-Time Example
**Ticket Booking**: Two people booking last seat simultaneously. SERIALIZABLE ensures only one succeeds. READ UNCOMMITTED might let both book (overbooking).

### Code Block
```sql
-- 1. READ UNCOMMITTED (dirty reads possible)
-- Session 1
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
START TRANSACTION;
UPDATE accounts SET balance = 500 WHERE id = 1;
-- NOT committed yet

-- Session 2
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
START TRANSACTION;
SELECT balance FROM accounts WHERE id = 1;
-- Returns 500 (dirty read! not committed yet)

-- Session 1
ROLLBACK;  -- Oops, Session 2 read wrong value!

-- 2. READ COMMITTED (no dirty reads)
-- Session 1
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
START TRANSACTION;
UPDATE accounts SET balance = 500 WHERE id = 1;
-- NOT committed yet

-- Session 2
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
START TRANSACTION;
SELECT balance FROM accounts WHERE id = 1;
-- Returns old value (e.g., 1000) - waits for commit

-- Session 1
COMMIT;

-- Session 2
SELECT balance FROM accounts WHERE id = 1;
-- Now returns 500 (committed value)

-- Problem: Non-repeatable read within same transaction
-- Session 2 sees different values for same query!

-- 3. REPEATABLE READ (MySQL default)
-- Session 1
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
START TRANSACTION;
SELECT balance FROM accounts WHERE id = 1;  -- Returns 1000

-- Session 2
UPDATE accounts SET balance = 500 WHERE id = 1;
COMMIT;

-- Session 1
SELECT balance FROM accounts WHERE id = 1;  -- Still returns 1000!
-- Sees snapshot from transaction start

COMMIT;

-- 4. SERIALIZABLE (full isolation)
-- Session 1
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
START TRANSACTION;
SELECT * FROM accounts WHERE balance > 500;

-- Session 2
INSERT INTO accounts (id, balance) VALUES (5, 600);
-- BLOCKED! Waits for Session 1 to commit

-- Session 1
COMMIT;

-- Session 2
-- Now INSERT completes

-- 5. Real Interview Example: Preventing Double Booking

-- Without proper isolation (❌ Problem)
-- Session 1
SELECT available_seats FROM flights WHERE id = 100;  -- Returns 1
-- Book last seat
UPDATE flights SET available_seats = 0 WHERE id = 100;

-- Session 2 (simultaneously)
SELECT available_seats FROM flights WHERE id = 100;  -- Also returns 1
-- Book last seat
UPDATE flights SET available_seats = 0 WHERE id = 100;

-- Result: Both succeeded! Overbooked!

-- Solution 1: SERIALIZABLE
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
START TRANSACTION;
SELECT available_seats FROM flights WHERE id = 100 FOR UPDATE;  -- Locks row
-- Check if available
UPDATE flights SET available_seats = available_seats - 1;
COMMIT;

-- Solution 2: Optimistic Locking
START TRANSACTION;
SELECT available_seats, version FROM flights WHERE id = 100;
-- available_seats = 1, version = 5

UPDATE flights 
SET available_seats = 0, version = 6
WHERE id = 100 AND version = 5;  -- Only if version hasn't changed

-- Check affected rows
-- If 0 rows updated → someone else modified → retry

COMMIT;

-- Solution 3: SELECT FOR UPDATE (pessimistic locking)
START TRANSACTION;
SELECT available_seats FROM flights WHERE id = 100 FOR UPDATE;
-- Locks row, other transactions wait

IF available_seats > 0 THEN
  UPDATE flights SET available_seats = available_seats - 1 WHERE id = 100;
  COMMIT;
ELSE
  ROLLBACK;
END IF;

-- 6. Isolation Level Comparison

/*
+-------------------+-----------+-----------------+-------------+--------+
| Isolation Level   | Dirty Read| Non-Repeatable  | Phantom Read| Speed  |
+-------------------+-----------+-----------------+-------------+--------+
| READ UNCOMMITTED  | Yes       | Yes             | Yes         | Fastest|
| READ COMMITTED    | No        | Yes             | Yes         | Fast   |
| REPEATABLE READ   | No        | No              | Yes*        | Slow   |
| SERIALIZABLE      | No        | No              | No          | Slowest|
+-------------------+-----------+-----------------+-------------+--------+

*MySQL InnoDB prevents phantom reads even in REPEATABLE READ
*/

-- Check current isolation level
SELECT @@transaction_isolation;

-- Set global default
SET GLOBAL transaction_isolation = 'READ-COMMITTED';

-- Set session default
SET SESSION transaction_isolation = 'REPEATABLE-READ';
```

---

## Interview Tips

1. **Draw Venn diagrams** for JOIN types
2. **Use bank transfer example** for ACID transactions
3. **Explain normalization** with before/after tables
4. **Discuss index trade-offs** (read vs write performance)
5. **Compare isolation levels** with real scenarios (booking, inventory)
6. **Mention B+tree structure** for indexes
7. **EXPLAIN** query execution plans
