# API Documentation - Example

## What is an API?
API (Application Programming Interface) is a set of rules that enables communication between different software applications.

## API Types
1. REST API - uses HTTP protocol
2. GraphQL API - flexible query format
3. SOAP API - based on XML
4. WebSocket API - for real-time communication

## REST API Endpoints

### GET /users
Returns a list of all users.
Parameters: page, limit
Response: JSON array of user objects

### POST /users
Creates a new user.
Parameters: name, email, password
Response: Created user with ID

### GET /users/:id
Returns a specific user by ID.
Parameters: id
Response: JSON user object

### PUT /users/:id
Updates a specific user.
Parameters: id, name, email
Response: Updated user

### DELETE /users/:id
Deletes a specific user.
Parameters: id
Response: Deletion confirmation

## Authentication
The API uses JWT tokens for authentication.
1. User logs in with username and password
2. The system returns a JWT token
3. The token is used in the Authorization header for all subsequent requests

## Error Handling
- 400: Bad Request - parameter errors
- 401: Unauthorized - user is not authenticated
- 403: Forbidden - user does not have access
- 404: Not Found - resource does not exist
- 500: Server Error - server error

## Rate Limiting
The API is limited to 1000 requests per hour.
The counter resets on the hour.
