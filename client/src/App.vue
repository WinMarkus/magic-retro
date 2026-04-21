<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

type Entry = {
  id: string
  role: string
  characterName: string
  text: string
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
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to save entry.')
    }

    text.value = ''
    await loadEntries()
  } catch {
    error.value = 'Could not submit your entry. Try again.'
  } finally {
    isSubmitting.value = false
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
      <h1>🏰 Magic Retro Icebreaker</h1>
      <p class="subtitle">Choose your role, claim a name, and add your tale.</p>

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

      <button class="secondary" type="button" @click="regenerateName">Regenerate Name</button>

      <label class="contribution">
        Contribution
        <textarea
          v-model="text"
          rows="3"
          placeholder="Share one short thought for this retro session..."
        />
      </label>

      <button class="add" type="button" :disabled="!canSubmit" @click="submitEntry">
        + Add Entry
      </button>

      <p v-if="error" class="error">{{ error }}</p>
    </section>

    <section class="panel">
      <h2>Shared Scroll</h2>
      <ul class="entries">
        <li v-for="entry in entries" :key="entry.id">
          <p class="meta">
            <strong>{{ entry.role }}</strong> · {{ entry.characterName }} ·
            {{ new Date(entry.createdAt).toLocaleTimeString() }}
          </p>
          <p>{{ entry.text }}</p>
        </li>
        <li v-if="entries.length === 0" class="empty">No entries yet. Be the first hero.</li>
      </ul>
    </section>
  </main>
</template>
