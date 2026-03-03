const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.RIOT_TOKEN;
const urlPuuid = "https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/"

// URLs base
const urlMatchesList = `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/`;
const urlMatchDetails = `https://europe.api.riotgames.com/lol/match/v5/matches/`;


async function extractorInfoGame(gameId, playerId)
{
    const matchDetail = await axios.get(urlMatchDetails + gameId, {
        headers: {"X-Riot-Token": API_KEY}
    });
    const machResponse = matchDetail.data
    const participantes = machResponse.metadata.participants
    const indexParticipante = participantes.findIndex(p => p === playerId);
    const playerData = machResponse.info.participants[indexParticipante]
    const rivalData = machResponse.info.participants[(indexParticipante + 5)%10]
    const playerDataClean = {
        champion: playerData.championName,
        rival: rivalData.championName,
        position: playerData.teamPosition,
        win: playerData.win,
        duration: machResponse.info.gameDuration,
        metrics: {
            kills: playerData.kills,
            deaths: playerData.deaths,
            assists: playerData.assists,
            cs_total: playerData.totalMinionsKilled + playerData.neutralMinionsKilled,
            gold_total: playerData.goldEarned
        },
        early: {
            gold_per_minute: playerData.challenges.goldPerMinute,
            minions_first10: playerData.challenges.laneMinionsFirst10Minutes,
            max_cs_advantage: playerData.challenges.maxCsAdvantageOnLaneOpponent,
            laning_advantage: playerData.challenges.laningPhaseGoldExpAdvantage,
            first_blood_kill: playerData.firstBloodKill,
            first_blood_assist: playerData.firstBloodAssist,
            damage_per_minute:  playerData.challenges.damagePerMinute

        },
        fight: {
            total_damage: playerData.totalDamageDealtToChampions,
            team_damage_per: playerData.challenges.damageTakenOnTeamPercentage,
            skillshot_dodge: playerData.challenges.skillshotsDodged,
            skillshot_hit: playerData.challenges.skillshotsHit,
            skillshot_dodge_small_window: playerData.challenges.dodgeSkillShotsSmallWindow,
            time_cc_others: playerData.timeCCingOthers,

        },
        macro: {
            kill_participation: playerData.challenges.killParticipation,
            damage_objetives: playerData.damageDealtToObjectives,
            damage_turrets: playerData.damageDealtToTurrets,
            turrets_takedown: playerData.turretTakedowns,
            early_participation: playerData.challenges.takedownsFirstXMinutes,
        },
        vision: {
            vision_score: playerData.visionScore,
            vision_score_per_minute: playerData.challenges.visionScorePerMinute,
            wards_placed: playerData.wardsPlaced,
            wards_killed: playerData.wardsKilled,
            control_wards: playerData.challenges.controlWardsPlaced,
        }
    }
    return playerDataClean
}

async function obtenerPuuid(username, tag)
{
    try {
        const response = await axios.get(urlPuuid + `${username}/${tag}`, {
            headers: { "X-Riot-Token": API_KEY }
        });
        return response.data.puuid;
    }
    catch (error) {
        return undefined
    }
}

async function lastMatch(puuid)
{
    const match = await axios.get(urlMatchesList + puuid + "/ids?start=0&count=1", {
        headers: { "X-Riot-Token": API_KEY, "Content-Type": "application/json" }
    });
    return match.data[0];
}

async function llamadaIA(datosGame)
{
    const datos = {
        model: "arcee-ai/trinity-large-preview:free",
        messages: [
            {
                role: "system",
                content: "Actúas como el Head Coach y Analista de Datos de un equipo profesional de League of Legends (nivel Challenger). Tu personalidad es sarcástica, dura y tienes un tono burlesco (como un coach exigente que se ríe un poco de las desgracias de sus alumnos). Quieres que el jugador mejore, pero no le vas a tener piedad si sus números son un desastre.\n\n" +
                    "Tus reglas inquebrantables son:\n" +
                    "1. BASADO EN DATOS: Nunca inventes, asumas o alucines estadísticas que no estén presentes en el JSON proporcionado.\n" +
                    "2. CONTEXTO DE ROL Y META: Evalúa los números según el campeón y el rol. Por ejemplo, un CS bajo es normal en un Support, pero inaceptable en un ADC. Un KDA alto no importa si la participación en asesinatos o el daño a objetivos es nulo. Además, considera cómo encaja ese campeón en el metajuego actual al hacer tu evaluación.\n" +
                    "3. ACCIONABLE Y BURLÓN: Tus consejos deben ser mecánicos o estratégicos de alto nivel (ej. 'aplica slow push en la 3ra oleada', 'wardea el píxel brush antes de rotar'), pero acompáñalos de comentarios sarcásticos sobre su falta de habilidad actual. Está prohibido dar consejos vagos o clichés.\n" +
                    "4. FORMATO ESTRICTO: Siempre debes responder utilizando la estructura exacta que el usuario te solicite, sin añadir introducciones largas ni conclusiones innecesarias."
            },
            {
                role: "user",
                content: "Analiza los siguientes datos estadísticos de mi última partida de League of Legends. Ten muy en cuenta el campeón que utilicé, mi posición (rol) y la duración de la partida para evaluar mi rendimiento.\n\n" +
                    "Entrégame tu evaluación utilizando EXACTAMENTE la siguiente estructura:\n\n" +
                    "**1. Resumen de Desempeño (El Roasting)**\n" +
                    "Una o dos oraciones contundentes, sarcásticas y en tono de burla evaluando mi impacto general en la partida. Si jugué mal, ríete de mí sin piedad; si jugué bien, sé condescendiente o sorpréndete irónicamente de que no haya arruinado la partida.\n\n" +
                    "**2. Fortalezas (Lo que, milagrosamente, hiciste bien)**\n" +
                    "Identifica 2 áreas donde destaqué. **Obligatorio:** Menciona los números exactos del JSON para respaldar tu punto (ej. 'Al menos tu daño por minuto fue de X' o 'Sorprendentemente lograste un CS de X al minuto 10').\n\n" +
                    "**3. Debilidades (Por qué le pesas a tu equipo)**\n" +
                    "Identifica 2 áreas donde estuve por debajo del nivel esperado para mi rol. **Obligatorio:** Menciona los datos exactos que demuestran este déficit y haz énfasis en lo lamentables que son esos números.\n\n" +
                    "**4. Plan de Acción (Para que dejes de dar pena)**\n" +
                    "Proporciona 3 consejos prácticos y mecánicamente específicos para corregir las debilidades mencionadas. Sé directo y técnico.\n\n" +
                    "**5. Nota Final (El Veredicto)**\n" +
                    "Un comentario final lapidario cerrando el análisis diciendo si mi equipo me carreó, si merezco el report o si mágicamente jugué de manera decente. Finaliza este punto otorgando una nota numérica del 0 al 10 en el formato exacto: '... mal desarrollo y tu nota es [NÚMERO]'. (Donde 0 es 'un minion aportó más que tú' y 10 es 'Faker en su prime').\n\n" +
                    "**6. Explicación de la Nota (La cruda realidad)**\n" +
                    "Una explicación detallada y técnica de por qué recibí esa puntuación específica. Basa esta explicación estrictamente en cómo se debe jugar mi campeón en el meta actual y por qué los números del JSON demuestran que alcancé (o fallé miserablemente) ese estándar.\n\n" +
                    "--- DATOS DE LA PARTIDA ---\n" +
                    JSON.stringify(datosGame, null, 2)
            }
        ]
    };
    const data = await axios.post("https://openrouter.ai/api/v1/chat/completions", datos,
        {headers: {"Authorization": `Bearer ${process.env.GOOGLE_TOKEN}` , "Content-Type": "application/json"}})

    return data.data.choices[0].message.content
}

async function todos(username, tag)
{
    const puuid = await obtenerPuuid(username, tag);
    const game = await lastMatch(puuid)
    const gameInfo = await extractorInfoGame(game, puuid)
    return await llamadaIA(gameInfo);

}

module.exports = {
    todos
}