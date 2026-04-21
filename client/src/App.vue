<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

type Entry = {
  id: string
  role: string
  characterName: string
  text: string
  avatar?: string
  createdAt: number
}

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
] as const

const namesByRole: Record<(typeof roles)[number], string[]> = {
  Knight: ['Thorne Ironclad', 'Ser Cedric Dawnshield', 'Lady Briar Valorcrest'],
  Mage: ['Eldrin Flameweaver', 'Myrra Starwhisper', 'Varyn Spellthorn'],
  Ranger: ['Kael Mossarrow', 'Lyra Greenstride', 'Rowan Swiftquiver'],
  Healer: ['Sister Elowen Lightbloom', 'Tarin Kindhands', 'Mira Dawnpetal'],
  Rogue: ['Nyx Shadowstep', 'Corvin Quickcoin', 'Vesper Nightgrin'],
  Bard: ['Pippin Lutesong', 'Aria Silverrhyme', 'Milo Merryverse'],
  Paladin: ['Sir Aurek Sunblade', 'Helena Oathguard', 'Garron Brighthelm'],
  Dragon: ['Emberfang the Bold', 'Skyrend Ashwing', 'Cindermaw the Grand'],
  Necromancer: ['Morwen Gravebloom', 'Silas Bonechant', 'Velka Duskveil'],
  Alchemist: ['Quill Fizzbrew', 'Sable Embervial', 'Tobin Goldflask'],
}

const role = ref<(typeof roles)[number]>('Knight')
const characterName = ref('')
const text = ref('')
const entries = ref<Entry[]>([])
const isSubmitting = ref(false)
const error = ref('')
const avatar = ref('')
const avatarError = ref('')
const avatarInput = ref<HTMLInputElement | null>(null)
const MAX_AVATAR_SOURCE_SIZE_BYTES = 8_000_000
const AVATAR_MAX_DIMENSION = 128
const AVATAR_OUTPUT_QUALITY = 0.7
const AVATAR_DATA_URL_PATTERN = /^data:image\/[a-z0-9.+-]+;base64,/i

function randomNameForRole(selectedRole: (typeof roles)[number]) {
  const names = namesByRole[selectedRole]
  return names[Math.floor(Math.random() * names.length)]
}

function regenerateName() {
  characterName.value = randomNameForRole(role.value)
}

watch(role, regenerateName, { immediate: true })

async function loadEntries() {
  try {
    const response = await fetch('/api/entries')
    if (!response.ok) {
      throw new Error('Failed to load entries.')
    }
    const data = (await response.json()) as Entry[]
    entries.value = data.sort((a, b) => b.createdAt - a.createdAt)
  } catch {
    error.value = 'Could not refresh entries right now.'
  }
}

async function submitEntry() {
  if (!text.value.trim()) return

  isSubmitting.value = true
  error.value = ''
  try {
    const response = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: role.value,
        characterName: characterName.value,
        text: text.value.trim(),
        avatar: avatar.value || undefined,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to save entry.')
    }

    text.value = ''
    avatar.value = ''
    avatarError.value = ''
    if (avatarInput.value) {
      avatarInput.value.value = ''
    }
    await loadEntries()
  } catch {
    error.value = 'Could not submit your entry. Try again.'
  } finally {
    isSubmitting.value = false
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load avatar image.'))
    }
    image.src = objectUrl
  })
}

async function processAvatar(file: File): Promise<string> {
  const image = await loadImage(file)

  const scale = Math.min(1, AVATAR_MAX_DIMENSION / Math.max(1, image.width, image.height))
  const targetWidth = Math.max(1, Math.round(image.width * scale))
  const targetHeight = Math.max(1, Math.round(image.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas is not available.')
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight)
  const processedAvatar = canvas.toDataURL('image/jpeg', AVATAR_OUTPUT_QUALITY)

  if (!AVATAR_DATA_URL_PATTERN.test(processedAvatar)) {
    throw new Error('Failed to encode avatar.')
  }

  return processedAvatar
}

async function onAvatarSelected(event: Event) {
  avatarError.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    avatar.value = ''
    return
  }
  if (!file.type.startsWith('image/')) {
    avatar.value = ''
    avatarError.value = 'Please choose an image file.'
    input.value = ''
    return
  }
  if (file.size > MAX_AVATAR_SOURCE_SIZE_BYTES) {
    avatar.value = ''
    avatarError.value = 'Avatar file is too large. Please choose one under 8MB.'
    input.value = ''
    return
  }

  try {
    avatar.value = await processAvatar(file)
  } catch {
    avatar.value = ''
    avatarError.value = 'Could not process that image. Try another one.'
    input.value = ''
  }
}

function clearAvatar() {
  avatar.value = ''
  avatarError.value = ''
  if (avatarInput.value) {
    avatarInput.value.value = ''
  }
}

async function deleteEntry(id: string) {
  if (!window.confirm('Remove this entry from the scroll?')) {
    return
  }

  error.value = ''
  try {
    const response = await fetch(`/api/entries/${id}`, { method: 'DELETE' })
    if (!response.ok) {
      throw new Error('Failed to delete entry.')
    }
    entries.value = entries.value.filter((entry) => entry.id !== id)
  } catch {
    error.value = 'Could not remove this entry right now.'
  }
}

const intervalId = ref<number | undefined>(undefined)

onMounted(async () => {
  await loadEntries()
  intervalId.value = window.setInterval(loadEntries, 4000)
})

onUnmounted(() => {
  if (intervalId.value !== undefined) {
    clearInterval(intervalId.value)
  }
})

const canSubmit = computed(() => !isSubmitting.value && !!text.value.trim())
</script>

<template>
  <main class="page">
    <section class="panel">
      <h1>🏰 The Chronicle</h1>
      <p class="subtitle">Choose a role, claim a name, and add your tale.</p>

      <div class="form-grid">
        <label>
          Role
          <select v-model="role">
            <option v-for="currentRole in roles" :key="currentRole" :value="currentRole">
              {{ currentRole }}
            </option>
          </select>
        </label>

        <label>
          Character Name
          <input v-model="characterName" type="text" />
        </label>
      </div>

      <button class="secondary" type="button" @click="regenerateName">New Name</button>

      <label class="contribution">
        Your Tale
        <textarea
          v-model="text"
          rows="3"
          placeholder="Share one short thought for this session..."
        />
      </label>

      <div class="avatar-upload">
        <label class="secondary avatar-picker">
          Add Avatar
          <input ref="avatarInput" type="file" accept="image/*" @change="onAvatarSelected" />
        </label>
        <img v-if="avatar" class="avatar-preview" :src="avatar" alt="Selected avatar preview" />
        <button v-if="avatar" class="secondary clear-avatar" type="button" @click="clearAvatar">Clear</button>
      </div>
      <p v-if="avatarError" class="error">{{ avatarError }}</p>

      <button class="add" type="button" :disabled="!canSubmit" @click="submitEntry">
        Inscribe
      </button>

      <p v-if="error" class="error">{{ error }}</p>
    </section>

    <section class="panel">
      <h2>Shared Scroll</h2>
      <ul class="entries">
        <li v-for="entry in entries" :key="entry.id" class="entry">
          <img v-if="entry.avatar" class="entry-avatar" :src="entry.avatar" :alt="`${entry.characterName} avatar`" />
          <div v-else class="entry-avatar placeholder">✶</div>
          <div class="entry-content">
            <p class="meta">
              <strong>{{ entry.role }}</strong> · {{ entry.characterName }} ·
              {{ new Date(entry.createdAt).toLocaleTimeString() }}
            </p>
            <p>{{ entry.text }}</p>
            <button class="secondary delete" type="button" @click="deleteEntry(entry.id)">Delete</button>
          </div>
        </li>
        <li v-if="entries.length === 0" class="empty">The scroll is empty for now.</li>
      </ul>
    </section>
  </main>
</template>
