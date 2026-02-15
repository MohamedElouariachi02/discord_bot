const { Client, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
require('dotenv').config();
const tiemposAFK = '/data/tiemposAFK.json';
const tiemposTemp = new Map()
const CANAL_OBSERVADO= "1468692350472687746"
const ID_PROPIETARIO= "716413074973917234"

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
    { intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.DirectMessages],
        partials: [Partials.Channel, Partials.Message] });

// Cuando la "llamada de teléfono" se establece con éxito, salta este evento
client.once('ready', () => {
    console.log(`¡Conectado exitosamente como ${client.user.tag}!`);

    // Establecimiento del estado del BOT
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

client.on('messageCreate', async (message) => {
    // Pasa si es su propio mensaje
    if (message.author.id === client.user.id)
    {
        return;
    }

    // Comandos generales
    if (message.content.toString() === "!listaAFK")
    {
        await message.reply(await verListaAFK(message))
    }

    // Comandos de administrador
    if (message.author.id === ID_PROPIETARIO)
    {
        // Envia el fichero JSON de los tiempos AFK
        if (message.content.toString() === "!AFK")
        {
            await message.reply({content: "Reporte AFK", files: [tiemposAFK]});
        }

        // Borra todos sus mensajes
        if (message.content.toString() === "!limpiar")
        {
            const mensajes = await message.channel.messages.fetch( );
            mensajes.forEach(mensaje=> {
                if (mensaje.author.bot)
                {
                    mensaje.delete();
                }
            })
        }

        //Borra todos los mensajes de un canal
        if (message.content.toString() === "!limpiarTodo")
        {
            const mensajes = await message.channel.messages.fetch( );
            mensajes.forEach(mensaje=> { mensaje.delete(); })
        }
        return;
    }


})

async function verListaAFK(message)
{
    const datos = cargarDatos();
    console.log(datos);
    var final = "------------------------------------------------------------\n";
    for (const id in datos) {
        var user = null
        message.guild.members.cache.forEach(member => {
            console.log(member.id)
            console.log(id)
            if (member.id === id)
            {
                console.log(member)
                user = member.user.username
            }
        })
        final += "- " + user + ": " + datos[id] / 60000 + " minutos" +"\n"
    }
    return final + "------------------------------------------------------------"
}

// ¡ESTA ES LA LÍNEA MÁGICA!
// Inicia el WebSocket, envía el token, mantiene el Heartbeat y te pone "En línea"
client.login(process.env.DISCORD_TOKEN);

