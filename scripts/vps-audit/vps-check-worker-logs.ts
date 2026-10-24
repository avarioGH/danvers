import { Client } from 'ssh2';

const conn = new Client();

const checkLogScript = `
echo "=== JOURNALCTL LOGS FOR JARVIS-WORKER ==="
journalctl -u jarvis-worker -n 25 --no-pager
echo "=== WORKER ENV CHECK (Redacted) ==="
ls -la /etc/jarvis-worker/worker.env
cat /etc/jarvis-worker/worker.env | awk -F'=' '{print $1}'
`;

conn.on('ready', () => {
  conn.exec(checkLogScript, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    stream.on('close', () => conn.end())
      .on('data', (d: Buffer) => process.stdout.write(d.toString()))
      .stderr.on('data', (d: Buffer) => process.stderr.write(d.toString()));
  });
}).connect({
  host: '194.233.85.181',
  port: 22,
  username: 'root',
  password: process.env.VPS_SSH_PASSWORD || 'Avario050306'
});
