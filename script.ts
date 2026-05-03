import fs from 'fs';

let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/opacity-[456]0/g, 'opacity-90');
fs.writeFileSync('src/App.tsx', app);

let auth = fs.readFileSync('src/components/Auth.tsx', 'utf8');
auth = auth.replace(/text-\[#141414\]\/[46]0/g, 'text-[#141414]/90');
fs.writeFileSync('src/components/Auth.tsx', auth);
