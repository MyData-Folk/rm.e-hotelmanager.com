import fs from 'fs';
const content = fs.readFileSync('c:\\Users\\Farouk\\Downloads\\audit-rm.e-hotelmanager_refactorise\\server.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('app.get(') || line.includes('app.post(') || line.includes('app.put(') || line.includes('app.delete(')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
