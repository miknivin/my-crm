# AI Natural Language Query – Social CRM Plan

## 1. Goal

Allow users to query CRM data using natural language.

Examples

```text
show leads created this week
show contacts created yesterday
total contacts
total lead worth
show leads created this week
```

The system must:

1. Convert user text → structured QuerySpec
2. Decide query type (find or aggregation)
3. Execute MongoDB query
4. Return results with **verifiable data**
5. Render dynamic UI in Next.js

---

# 2. Core Principle (Important)

The response must allow **user validation**.

Whenever possible the response should include:

Required visible fields

```text
name
email
phone
createdAt
```

And also the **field used in the filter or aggregation**.

Example

User query

```text
show leads created this week
```

Response table

| Name | Email | Phone | Created At |
| ---- | ----- | ----- | ---------- |

The user can visually confirm the data matches the request.

---

# 3. System Architecture

User Input (Next.js UI)

↓

AI Query Parser

↓

QuerySpec JSON

↓

Query Validator

↓

MongoDB Query Executor

↓

Result Formatter

↓

Dynamic React UI

---

# 4. Query Types

The system supports two types.

## 1. Find Queries

Used when user asks for records.

Example

```text
show leads created this week
```

QuerySpec

```json
{
  "collection": "leads",
  "type": "find",
  "filters": [
    {
      "field": "createdAt",
      "operator": "last_days",
      "value": 7
    }
  ],
  "limit": 20
}
```

Mongo query

```javascript
db.leads.find(
 { createdAt: { $gte: date } }
).limit(20)
```

Returned fields

```text
name
email
phone
createdAt
```

---

## 2. Aggregation Queries

Used when user asks:

* total
* count
* sum
* average

Example

```text
total contacts
```

QuerySpec

```json
{
  "collection": "contacts",
  "type": "aggregation",
  "aggregation": {
    "operation": "count"
  }
}
```

Mongo pipeline

```javascript
[
 { $count: "totalContacts" }
]
```

---

# 5. Aggregation With Validation Records

When aggregation is used, return **both summary and sample records**.

Example

User query

```text
total lead worth this week
```

Response

Summary

```text
Total Worth = 120000
```

Validation records

| Name | Email | Phone | Deal Value | Created At |
| ---- | ----- | ----- | ---------- | ---------- |

This allows the user to **verify the aggregation result**.

---

# 6. QuerySpec Structure

AI must generate structured JSON.

```json
{
  "collection": "leads",
  "type": "find | aggregation",
  "filters": [],
  "aggregation": {},
  "limit": 20
}
```

Important rule

If user asks for:

```text
total
count
sum
average
```

Then

```text
type = aggregation
```

Otherwise

```text
type = find
```

---

# 7. API Design

## Parse Query API

POST

```
/api/ai/parse
```

Input

```json
{
 "query": "show leads created this week"
}
```

Output

QuerySpec JSON

---

## Run Query API

POST

```
/api/ai/query
```

Input

QuerySpec JSON

Output

```json
{
 "data": [],
 "summary": {},
 "ui": {}
}
```

Example

```json
{
 "summary": {
   "totalContacts": 152
 },
 "data": [],
 "ui": {
   "type": "stat_table"
 }
}
```

---

# 8. Default Fields Returned

For validation purposes the system should always return:

```text
name
email
phone
createdAt
```

Plus:

Any fields used in the query.

Example

Query

```text
total lead worth
```

Additional field

```text
dealValue
```

---

# 9. MongoDB Indexes

Indexes required

```text
createdAt
email
ownerId
stage
dealValue
```

These ensure fast filtering and aggregation.

---

# 10. Validation Layer

Never trust AI output directly.

Validate:

Allowed collections

```text
contacts
leads
activities
```

Allowed fields

```text
name
email
phone
createdAt
stage
dealValue
ownerId
```

Reject unknown fields.

---

# 11. Security

Always enforce user scope.

Example

```javascript
ownerId = loggedInUser
```

This prevents users accessing other data.

Blocked fields

```text
password
apiKey
tokens
```

---

# 12. Example End-to-End Flow

User Query

```text
show leads created this week
```

AI Output

```json
{
 "collection": "leads",
 "type": "find",
 "filters": [
   {
     "field": "createdAt",
     "operator": "last_days",
     "value": 7
   }
 ]
}
```

Mongo query

```javascript
db.leads.find({
 createdAt: { $gte: date }
})
```

UI Response

Table

| Name | Email | Phone | Created At |
