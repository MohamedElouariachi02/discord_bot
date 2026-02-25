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
        headers: { "X-Riot-Token": API_KEY }
    });
    return match.data[0];
}

async function llamadaIA(datosGame)
{
    const datos = {
        // 1. Añadimos esta configuración para hacerlo estricto y menos "creativo"
        generationConfig: {
            temperature: 0.2
        },
        contents: [
            {
                role: "user",
                parts: [
                    {
                        text: "Actúas como el Head Coach y Analista de Datos de un equipo profesional de League of Legends (nivel Challenger). Tu personalidad es sarcástica, dura y tienes un tono burlesco.\n\n" +
                            "REGLAS INQUEBRANTABLES:\n" +
                            "1. BASADO EN DATOS: No inventes estadísticas.\n" +
                            "2. CONTEXTO DE ROL: Evalúa según el campeón y posición.\n" +
                            "3. ACCIONABLE Y BURLÓN: Consejos técnicos pero con sarcasmo.\n" +
                            "4. IDIOMA: Responde ÚNICAMENTE en ESPAÑOL.\n" +
                            "5. PROHIBIDO REPETIR DATOS: NO devuelvas el código JSON.\n\n" +
                            "Analiza los datos de mi partida y devuelve tu evaluación usando EXACTAMENTE Y ÚNICAMENTE esta plantilla (rellena los datos donde corresponda, sin añadir texto antes ni después):\n\n" +
                            "**1. Resumen de Desempeño (El Roasting)**\n" +
                            "[Tu evaluación contundente y sarcástica aquí]\n\n" +
                            "**2. Fortalezas (Lo que, milagrosamente, hiciste bien)**\n" +
                            "* [Fortaleza 1 con datos]\n" +
                            "* [Fortaleza 2 con datos]\n\n" +
                            "**3. Debilidades (Por qué le pesas a tu equipo)**\n" +
                            "* [Debilidad 1 con datos de lo lamentable que fue]\n" +
                            "* [Debilidad 2 con datos]\n\n" +
                            "**4. Plan de Acción (Para que dejes de dar pena)**\n" +
                            "* [Consejo técnico 1]\n" +
                            "* [Consejo técnico 2]\n" +
                            "* [Consejo técnico 3]\n\n" +
                            "--- DATOS DE LA PARTIDA ---\n" +
                            JSON.stringify(datosGame, null, 2)
                    }
                ]
            }
        ]
    };

    const data = await axios.post("https://generativelanguage.googleapis.com/v1beta/models/gemma-3-1b-it:generateContent", datos,
        {headers: {"x-goog-api-key": process.env.GOOGLE_TOKEN, "Content-Type": "application/json"}})

    return data.data.candidates[0].content.parts[0].text
}

async function todos(username, tag)
{
    const puuid = await obtenerPuuid(username, tag);
    const game = await lastMatch(puuid)
    const gameInfo = await extractorInfoGame(game, puuid)
    return await llamadaIA(gameInfo);

}

todos("Magickio", "Magic").then(algo =>
{
    console.log(algo)
})

module.exports = {
    todos
}