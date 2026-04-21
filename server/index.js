const express = require('express');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const MAX_AVATAR_SIZE_BYTES = 1_000_000;
const allowedAvatarMimeTypes = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

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

function isValidAvatar(avatarValue) {
  const prefixEnd = avatarValue.indexOf(';base64,');
  if (!avatarValue.startsWith('data:') || prefixEnd === -1) {
    return false;
  }

  const mimeType = avatarValue.slice(5, prefixEnd).toLowerCase();
  if (!allowedAvatarMimeTypes.has(mimeType)) {
    return false;
  }

  const base64Data = avatarValue.slice(prefixEnd + ';base64,'.length);
  if (!base64Data || base64Data.length % 4 !== 0) {
    return false;
  }

  let padding = 0;
  for (let i = base64Data.length - 1; i >= 0 && base64Data[i] === '='; i -= 1) {
    padding += 1;
  }
  if (padding > 2) {
    return false;
  }

  for (let i = 0; i < base64Data.length - padding; i += 1) {
    const char = base64Data[i];
    const isUpper = char >= 'A' && char <= 'Z';
    const isLower = char >= 'a' && char <= 'z';
    const isDigit = char >= '0' && char <= '9';
    if (!isUpper && !isLower && !isDigit && char !== '+' && char !== '/') {
      return false;
    }
  }
  for (let i = base64Data.length - padding; i < base64Data.length; i += 1) {
    if (base64Data[i] !== '=') {
      return false;
    }
  }

  const byteSize = Math.floor((base64Data.length * 3) / 4) - padding;
  return byteSize > 0 && byteSize <= MAX_AVATAR_SIZE_BYTES;
}

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
  if (avatarValue && !isValidAvatar(avatarValue)) {
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
