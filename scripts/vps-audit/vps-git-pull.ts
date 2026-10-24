import { Client } from 'ssh2';

const conn = new Client();

const pullScript = `
set -e
echo "=== STEP 1: VERIFY CWD ==="
cd /root/danvers
pwd

echo "=== STEP 2: STASH LOCAL PACKAGE-LOCK IF DIRTY ==="
git status --short
if ! git diff --quiet package-lock.json; then
  echo "Discarding uncommitted package-lock.json changes in /root/danvers..."
  git checkout package-lock.json
fi

echo "=== STEP 3: GIT PULL ORIGIN MAIN ==="
git pull origin main

echo "=== STEP 4: VERIFY COMMIT ON REMOTE VPS ==="
git log -n 3 --oneline
`;

conn.on('ready', () => {
  console.log('[SSH] Connected to VPS. Pulling latest code in /root/danvers...');
  conn.exec(pullScript, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    stream.on('close', (code: number) => {
      console.log(`[SSH] Pull finished with code ${code}`);
      conn.end();
    })
    .on('data', (d: Buffer) => process.stdout.write(d.toString()))
    .stderr.on('data', (d: Buffer) => process.stderr.write(d.toString()));
  });
}).connect({
  host: '194.233.85.181',
  port: 22,
  username: 'root',
  password: process.env.VPS_SSH_PASSWORD || 'Avario050306'
});
