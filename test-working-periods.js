const { exec } = require('child_process');

// Execute a curl command to trigger the manual detection endpoint
exec('curl -X POST http://localhost:3000/working-period/detect', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Stderr: ${stderr}`);
    return;
  }
  console.log(`Working period detection triggered successfully: ${stdout}`);
});
