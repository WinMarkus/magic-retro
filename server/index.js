const express = require('express');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const roles = [
  'Knight',
  'Mage',
  'Ranger',
  'Healer',
  'Rogue',
  'Bard',
  'Paladin',
  'Dragon',
  'Necromancer',
  'Alchemist',
];

const entries = [];

app.use(express.json());

app.get('/api/entries', (_req, res) => {
  res.json(entries);
});

app.post('/api/entries', (req, res) => {
  const { role, characterName, text } = req.body ?? {};

  const roleValue = typeof role === 'string' ? role.trim() : '';
  const nameValue = typeof characterName === 'string' ? characterName.trim() : '';
  const textValue = typeof text === 'string' ? text.trim() : '';

  if (!roles.includes(roleValue)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }
  if (!nameValue || !textValue) {
    return res.status(400).json({ error: 'characterName and text are required.' });
  }

  const entry = {
    id: randomUUID(),
    role: roleValue,
    characterName: nameValue,
    text: textValue,
    createdAt: Date.now(),
  };

  entries.unshift(entry);
  return res.status(201).json(entry);
});

const clientDistPath = path.resolve(__dirname, '../client/dist');
const clientIndexPath = path.join(clientDistPath, 'index.html');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(clientIndexPath);
  });
}

app.listen(PORT, () => {
  console.log(`Magic Retro server listening on port ${PORT}`);
});
