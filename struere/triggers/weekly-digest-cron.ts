import { defineTrigger, type TriggerConfig } from 'struere'

export default defineTrigger({
  name: 'Weekly Digest Cron',
  slug: 'weekly-digest-cron',
  description: 'Cada domingo a las 20:00 dispara al agente weekly-digest para que arme y envíe el resumen semanal.',
  on: {
    schedule: '0 20 * * 0',
    timezone: 'America/Santiago',
  } as unknown as TriggerConfig['on'],
  actions: [
    {
      tool: 'agent.chat',
      args: {
        agent: 'weekly-digest',
        message: 'Compila el resumen de la semana (lun-dom) y envíalo por email al coach. Usa query_events_range, entity.query para club-match/training-session/player, build_digest, y email.send.',
      },
    },
  ],
})
