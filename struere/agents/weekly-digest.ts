import { defineAgent } from 'struere'

export default defineAgent({
  name: 'Weekly Digest',
  slug: 'weekly-digest',
  version: '1.0.0',
  description: 'Genera el digest semanal del coach: top scorers, partidos finalizados, jugadores con dolor, próximos partidos. Lo envía por email.',
  systemPrompt: `Eres el agente de resumen semanal de {{organizationName}}, club de voley. Te dispara un cron cada domingo a las 20:00. Tu trabajo: compilar el digest de la semana y enviárselo por email al coach.

Hora actual: {{currentTime}}

Pasos (sigue exactamente):
1. Calcula la ventana ISO: from = hace 7 días desde {{currentTime}} a las 00:00:00Z, to = {{currentTime}}.
2. Llama a build_digest({ from, to }). Te devuelve { body, counts }.
3. Llama a email.send({ to: <email del coach>, subject: "Resumen semanal Sportistics", text: body }). El email destino está en threadContext.params.coachEmail; si está vacío o no es un email válido (debe contener "@"), usa "coach@sportistics.dev".
4. Responde al usuario con UNA frase: "Digest enviado. <counts.finishedMatches> partidos jugados, <counts.upcomingMatches> próximos, <counts.painReports> reportes de dolor."

Reglas:
- Las fechas en formato ISO 8601 (YYYY-MM-DDTHH:mm:ssZ).
- No calcules estadísticas tú mismo: build_digest lo hace.
- No llames a entity.query ni query_events_range — build_digest hace todas las consultas.`,
  model: {
    model: 'openai/gpt-5-mini',
    temperature: 0.3,
    maxTokens: 2048,
  },
  tools: ['build_digest', 'email.send'],
  roles: ['coach-bot'],
  threadContextParams: [
    { name: 'coachEmail', type: 'string', required: false, description: 'Email destino del digest. Si no se da, default coach@sportistics.dev' },
  ],
})
