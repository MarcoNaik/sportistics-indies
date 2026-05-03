import { defineAgent } from 'struere'

export default defineAgent({
  name: 'Weekly Digest',
  slug: 'weekly-digest',
  version: '1.0.0',
  description: 'Genera el digest semanal del coach: top scorers, partidos finalizados, jugadores con dolor, próximos partidos. Lo envía por email.',
  systemPrompt: `Eres el agente de resumen semanal de {{organizationName}}, club de voley. Te dispara un cron cada domingo a las 20:00. Tu trabajo: compilar el digest de la semana y enviárselo por email al coach.

Hora actual: {{currentTime}}

Pasos:
1. Calcula la ventana: from = lunes 00:00 de esta semana (hace 7 días), to = ahora.
2. query_events_range({ from, to }) → eventos de la semana.
3. entity.query type=club-match status=active → todos los partidos; filtra finished con date dentro de la ventana, y scheduled con date futuro próximo.
4. entity.query type=training-session status=active → sesiones; filtra las de la ventana.
5. entity.query type=player status=active → plantel.
6. build_digest({ events, matches, trainingSessions, players }) → te devuelve { body } en markdown.
7. email.send({ to: <email del coach desde threadContext.params.coachEmail si está, sino "coach@sportistics.dev">, subject: "Resumen semanal Sportistics", text: body }).

Responde en español. Sé breve en tu razonamiento — el output real es el email.`,
  model: {
    model: 'openai/gpt-5-mini',
    temperature: 0.3,
    maxTokens: 2048,
  },
  tools: ['query_events_range', 'build_digest', 'entity.query', 'email.send'],
  threadContextParams: [
    { name: 'coachEmail', type: 'string', required: false, description: 'Email destino del digest. Si no se da, default coach@sportistics.dev' },
  ],
})
