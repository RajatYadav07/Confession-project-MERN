# Confession Project

Confession Project is a small Node.js + Express app for submitting and viewing anonymous confessions.

## Features
- Submit a confession via a simple web form
- View confession history in the browser
- Basic authentication scaffolding using `auth/passport.js`

## Tech stack
- Node.js
- Express
- MongoDB (Mongoose models in `models/`)
- Passport for auth
- Static front-end in `public/`

## Quickstart

1. Install dependencies:

```bash
npm install
```

2. Provide environment variables (example):

- `MONGODB_URI` — MongoDB connection string
- `PORT` — optional (defaults to 3000)
- `SESSION_SECRET` — session secret for authentication

You can create a `.env` file or set them in your environment.

3. Start the app:

```bash
npm start
# or
node server.js
```

4. Open the app in browser:

http://localhost:3000

## Project structure

- `server.js` — application entry point
- `routes/confessions.js` — confessions routes
- `models/Confession.js` — Mongoose model for confessions
- `auth/passport.js` — Passport configuration
- `public/` — client-side assets (index.html, home.html, history.html, JS/CSS)

## Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feat/my-change`
3. Commit your changes and open a pull request

Please keep changes focused and include descriptive commit messages.

## License

This project is provided under the MIT License. See LICENSE file if added.

---

