const { Client, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const lolUtility = require('./lolAPITest')
require('dotenv').config();

const tiemposAFK = '/data/tiemposAFK.json';
const tiemposTemp = new Map()
const CANAL_OBSERVADO= "1468692350472687746"
const ID_PROPIETARIO= "716413074973917234"
const comandosInfo = {"!listaAFK": "Te enseño toda la lista de los miembros que han estado AFK",
"!hola": "Te saludo",
"!rule": "Te doy un color aleatorio",
"!lolLastMatch username#tag": "El bot te hace un resumen de tu ultima partida y te da consejos para mejorar"}

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

    // Lista de los tiempos de los usuarios en el canal AFK
    if (message.content.toString() === "!listaAFK")
    {
        await message.reply(await verListaAFK(message))
    }

    // Muestra la lista de comandos del BOT
    if (message.content.toString() === "!comandos")
    {
        await message.reply(await verComandos());
    }

    // Saluda a un miembro
    if (message.content.toString() === "!hola")
    {
        await message.reply("Holiii amigos mios");
    }

    // Gira la ruleta y muestra un color aleatorio
    if (message.content.toString() === "!rule")
    {
        const colores = ["rojo", "negro"];
        await message.reply(colores[Math.floor(Math.random() * (1 + 1))]);
    }

    if (message.content.toString().includes("!lolLastMatch"))
    {
        const user = message.content.toString().substring("!lolLastMatch".length + 1);
        const [username, tag] = user.split("#");
        await message.reply("Dejame analizar... :face_with_monocle: ")
        const vodReview = await lolUtility.todos(username, tag)
        await message.reply(vodReview.toString().substring(0, vodReview.toString().length / 2))
        await message.reply(vodReview.toString().substring(vodReview.toString().length / 2))
        await message.reply(`Esta es mi trayectoria: https://op.gg/es/lol/summoners/euw/${username}-${tag}`)
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
    }


})



async function verListaAFK(message)
{
    function textoTiempo(user, minutos)
    {
        if (minutos > 60)
        {
            return `- ${user}: ${(minutos / 60).toFixed(0)} horas y ${(minutos % 60).toFixed(0)} minutos\n`
        }
        return `- ${user}: ${(minutos).toFixed(0)} minutos\n`
    }


    const datos = cargarDatos();
    var final = "------------------------***TOP AFK***------------------------\n";
    const mapaUser = Object.entries(datos)
        .map(([id, time]) => {return {id: id, time: time}})
    .sort((a, b) => b.time - a.time);
    console.log(mapaUser)

    for (const userTime of mapaUser) {
        const userData = await client.users.fetch(userTime.id)
        const user = userData.username
        final += textoTiempo(user, userTime.time / 60000)
    }
    return final + "------------------------------------------------------------"
}

async function verComandos()
{
    var final = ""
    for (const [comando, info] of Object.entries(comandosInfo)) {
        final += "* " + comando + " : " + info + "\n";
        console.log(final);
    }
    return final;
}

client.login(process.env.DISCORD_TOKEN);

