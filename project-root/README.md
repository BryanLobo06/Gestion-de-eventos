# SPA Event Management

This is a **Single Page Application (SPA)** for event management, developed using only **pure HTML, CSS, and JavaScript** (no frameworks), using `json-server` as the mock backend. It allows an organizer to manage events, venues, and attendees, and allows visitors to register and participate in events.

---

## Key Features

- **User Authentication** (admin and visitors)
- **New Visitor Registration**
- **CRUD Event, Attendee, and Venue Management** (admin only)
- **Event Attendee Registration**
- **Viewing Registered Attendees by Event (admin)**
- **SPA with Protected Routes and Session Persistence**
- **Modern, Responsive Interface**

---

## Project Structure

```
/PROJECT-ROOT/
├── index.html # Main HTML
├── styles.css # Modern, responsive styles
└── app.js # SPA JS logic
└── db.json # Mock database for json-server
└── README.md # This file explains how the project is composed and how to run it.
```

---

## Installation and Execution

1. **Clone the repository or download the files.**

2. **Install json-server** (if you don't have it):
```bash
npm install -g json-server
# or
npm install json-server --save-dev

If you can't perform any CRUD actions (Create, Delete, or Update), stop json-server and restart it.
```

3. **Start the simulated backend:**
```bash
json-server --watch backend/db.json --port 3000
```
> json-server must be running on port 3000.

4. **Open `index.html` in your browser.**

---

## Example Users

- **Administrator:**
- User: `admin`
- Password: `admin123`
- **Visitor:**
- User: `visitor`
- Password: `visitor123`

New visitors must register before they can log in.

---

## Detailed Features

### Visitors
- Register as a user and attendee.
- Log in and view available events.
- Register for one or more events (with success messages or if already registered).

### Administrator
- CRUD for events, attendees, and venues.
- View registered attendees for each event.
- Delete, edit, and create events, attendees, and venues.

### Security and Experience
- Secure routes for administration.
- Session persistence in localStorage.
- Visual success and error messages.
- Responsive and modern interface.

---

## Database Example (`db.json`)

```json
{
"users": [
{ "id": 1, "username": "admin", "password": "admin123", "role": "admin" },
{ "id": 2, "username": "visitante", "password": "visitante123", "role": "visitor" }
],
"events": [
{ "id": 1, "name": "Concert", "placeId": 1, "date": "2024-07-01", "attendees": [2] }
],
"places": [
{ "id": 1, "name": "Auditorium", "capacity": 100 }
],
"attendees": [
{ "id": 2, "name": "Juan Pérez", "email": "juan@email.com" }
]
}
```

---

## Technologies Used
- **HTML5, CSS3, JavaScript ES6**
- **json-server** (fake REST API)

---

## Notes and Recommendations
- json-server doesn't implement real relationships, so the relationship between events and attendees is managed manually on the frontend.
- If you're having trouble with the API, make sure json-server is running and that port 3000 is free.
- You can customize styles in `styles.css`.

---

## Autor

- Brayan Enrique Balcazar lobo
- Clan Macondo
- bryanbalcazar307@gmail.com

