import { defineRole } from 'struere'

export default defineRole({
  name: 'coach-bot',
  description: 'Bot del coach: lectura de todas las entidades del club, escritura solo en callup.',
  agentAccess: ['coach-stats', 'whatsapp-callup', 'voice-suplente', 'weekly-digest'],
  policies: [
    { resource: 'player', actions: ['list', 'read'], effect: 'allow' },
    { resource: 'club-match', actions: ['list', 'read'], effect: 'allow' },
    { resource: 'volleyball-event', actions: ['list', 'read'], effect: 'allow' },
    { resource: 'training-session', actions: ['list', 'read'], effect: 'allow' },
    { resource: 'callup', actions: ['list', 'read', 'create', 'update'], effect: 'allow' },
  ],
})
