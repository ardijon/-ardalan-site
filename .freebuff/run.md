# Run Doc — Ardalan Site

This thread's workspace and the main checkout are the same directory, so this is a single-checkout setup. Procedures documented below are written so they can be reused if the workspace is ever a separate worktree.

## 1. Reproduce the uncommitted artifacts a fresh checkout needs

The repo **does not** commit `node_modules/` or `.env.local`. Both must be reproduced before the server will start.

Steps to perform in the worktree (`D:\New Projects\Landing Bio\ArdalaN`):

1. **Copy `.env.local` from the main checkout** (do NOT symlink).
   - On Windows in Git Bash / PowerShell:
     - `copy "<main-checkout>\.env.local" ".env.local"` (cmd)
     - `cp -f "<main-checkout>/.env.local" .env.local` (bash)
   - Reason not to symlink: future worktrees may need different values (e.g. a different `TELEGRAM_BOT_TOKEN` sandbox, a local `NEXT_PUBLIC_COUNTER_URL`). Copying preserves that flexibility. This project's `.env.local` currently has no port-binding values, but the convention is kept consistent.

2. **Install Node.js dependencies** using the committed lockfile.
   - Package manager: `npm` (a `package-lock.json` is committed; no `pnpm-lock.yaml` or `yarn.lock`).
   - Command: `npm install` (add `--prefer-offline --no-audit --no-fund` if you want a faster, quieter run).
   - This populates `node_modules/`.

3. (Optional sanity check) Verify both artifacts exist:
   - `ls .env.local` and `ls node_modules/next` should succeed.
   - `node -v` reports a Node version compatible with Next 14.2 (Node 18.17+ recommended).

No other uncommitted artifacts are required (no `.env.development`, no `Dockerfile`, no generated openapi spec, etc.). `next.config.js`, `tailwind.config.js`, `postcss.config.js`, `.eslintrc.json`, and `jsconfig.json` are all committed and ready to use.

## 2. Run the dev server

The `dev` script in `package.json` is `next dev`. Next.js's default port — and the project's default — is **3000**.

### Command

Detached, logging to a file under `.freebuff/`:

```bash
( nohup npm run dev -- -p 3000 > .freebuff/preview-<id>.log 2>&1 )
```

Replace `<id>` with the per-thread preview id provided in `<preview_state>`. The `-- -p 3000` after `--` passes the port flag through npm to `next dev`. Omitting it falls back to Next.js's default of 3000 as well, but passing it explicitly is safer when the port is part of the preview contract.

### Notes on platform-specific output

- On Windows, after writing the log, capture the listener PID via:
  - `netstat -ano | findstr ":3000" | findstr "LISTENING"`
  - Record the PID in `.freebuff/preview-<id>.pid` for clean teardown later.
  - Using `echo $!` immediately after `nohup ... &` may not return the true listener PID under all Windows + bash combinations — netstat is the authoritative source. The actual Next.js HTTP listener is the PID to register.
- On macOS/Linux, `echo $!` works as expected; PID file can be written directly.

### Healthcheck

After the server is detached, poll:

```bash
curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3000/
```

Expected: `200`. The first compile of `/` takes a few seconds; subsequent requests are sub-100ms. If the project ever grows enough that cold-start exceeds a few hundred milliseconds, raise the polling timeout in proportion.

### Port choice policy

1. First try Next.js default port **3000**. Check with `netstat -ano | findstr ":3000"` (Windows) or `lsof -i :3000` (macOS/Linux).
2. If 3000 is busy, try 3001, 3002 — also free of any Next.js reservations in the project.
3. If those are also busy, scan upward to the first free port. Update the `-p` flag in the start command and the URL passed to `register_preview`.

Currently port **3000** is the chosen port and is healthy.

### Registration

Once the URL returns 200, call `register_preview` with:
- `url`: `http://localhost:3000/`
- `pid`: the actual TCP-listener PID (verified via `netstat`).

This thread's current registration: `url=http://localhost:3000/`, `pid=9324`. Recorded in `.freebuff/preview-thmrokgms43a3z.pid`. Log file: `.freebuff/preview-thmrokgms43a3z.log`.

### Teardown

When the preview should be stopped:

```bash
# Windows: kill the listener PID
taskkill /PID <pid> /F
# macOS/Linux:
kill <pid>
```

A second `EADDRINUSE` on a follow-up start typically means a previous run was not fully torn down — kill any lingering Next.js / `next-server` processes first.
