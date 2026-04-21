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
  const { role, characterName, text, avatar } = req.body ?? {};

  const roleValue = typeof role === 'string' ? role.trim() : '';
  const nameValue = typeof characterName === 'string' ? characterName.trim() : '';
  const textValue = typeof text === 'string' ? text.trim() : '';
  const avatarValue = typeof avatar === 'string' ? avatar.trim() : '';

  if (!roles.includes(roleValue)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }
  if (!nameValue || !textValue) {
    return res.status(400).json({ error: 'characterName and text are required.' });
  }
  if (avatarValue && !/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(avatarValue)) {
    return res.status(400).json({ error: 'Invalid avatar.' });
  }

  const entry = {
    id: randomUUID(),
    role: roleValue,
    characterName: nameValue,
    text: textValue,
    ...(avatarValue ? { avatar: avatarValue } : {}),
    createdAt: Date.now(),
  };

  entries.unshift(entry);
  return res.status(201).json(entry);
});

app.delete('/api/entries/:id', (req, res) => {
  const index = entries.findIndex((entry) => entry.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Entry not found.' });
  }

  entries.splice(index, 1);
  return res.status(204).send();
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
