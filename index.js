const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const tiemposAFK = './tiemposAFK.json';
const tiemposTemp = new Map()
const CANAL_OBSERVADO= "1468692350472687746"

function cargarDatos()
{
    if (!fs.existsSync(tiemposAFK))
    {
        fs.writeFileSync(tiemposAFK, JSON.stringify({}));
        return {};
    }

    const datosRaw = fs.readFileSync(tiemposAFK, 'utf-8');
    return JSON.parse(datosRaw);
}

function guardarDatos(datos)
{
    fs.writeFileSync(tiemposAFK, JSON.stringify(datos, null, 2));
}


const client = new Client(
    { intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates] });

// Cuando la "llamada de teléfono" se establece con éxito, salta este evento
client.once('ready', () => {
    console.log(`¡Conectado exitosamente como ${client.user.tag}!`);

    // Opcional: Puedes cambiar el estado a "Jugando a..." o "Viendo..."
    client.user.setPresence({
        activities: [{ name: 'Deslizando por Tinder 🔥', type: 0 }],
        status: 'online',
    });
});


client.on('voiceStateUpdate', (oldState, newState) => {
    if (oldState.channelId === newState.channelId ) {
        return;
    }

    if (oldState.channelId === CANAL_OBSERVADO) {
        var entrada = tiemposTemp.get(oldState.id);
        if (entrada)
        {
            var tiempoTotal = Date.now() - entrada;
            let baseDatos = cargarDatos();
            if (!baseDatos[oldState.id])
            {
                baseDatos[oldState.id] = 0;
            }
            baseDatos[oldState.id] += tiempoTotal;

            guardarDatos(baseDatos)

            tiemposTemp.delete(oldState.id);
        }
        return;
    }
    if (newState.channelId === CANAL_OBSERVADO) {
        tiemposTemp.set(newState.id, Date.now());
        console.log();
    }
})


// ¡ESTA ES LA LÍNEA MÁGICA!
// Inicia el WebSocket, envía el token, mantiene el Heartbeat y te pone "En línea"
client.login(process.env.DISCORD_TOKEN);
