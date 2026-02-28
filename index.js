const { Client, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const lolUtility = require('./lolAPITest')
require('dotenv').config();

const tiemposAFK = '/data/tiemposAFK.json';
const ruterEnfado = '/data/ruterEnfados.json';
const tiemposTemp = new Map()
const CANAL_OBSERVADO= "1468692350472687746"
const ID_PROPIETARIO= "716413074973917234"
const comandosInfo = {"!listaAFK": "Te enseño toda la lista de los miembros que han estado AFK",
"!hola": "Te saludo",
"!rule": "Te doy un color aleatorio",
"!lolLastMatch username#tag": "El bot te hace un resumen de tu ultima partida y te da consejos para mejorar",
"!ruterTilt": "Suma 1 enfado a la lista de enfados de ByRuter",
"!verRuterTilt" : "Muestra cuantos tilts lleva nuestro amigo ByRuter"}

function cargarDatos(archivo)
{
    if (!fs.existsSync(archivo))
    {
        fs.writeFileSync(archivo, JSON.stringify({}));
        return {};
    }

    const datosRaw = fs.readFileSync(archivo, 'utf-8');
    return JSON.parse(datosRaw);
}

function guardarDatos(archivo, datos)
{
    fs.writeFileSync(archivo, JSON.stringify(datos, null, 2));
}

function sumaMinutosUser(entrada, oldState)
{
    var tiempoTotal = Date.now() - entrada;
    let baseDatos = cargarDatos(tiemposAFK);
    if (!baseDatos[oldState.id])
    {
        baseDatos[oldState.id] = 0;
    }
    baseDatos[oldState.id] += tiempoTotal;

    guardarDatos(tiemposAFK, baseDatos)

    tiemposTemp.delete(oldState.id);
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
            sumaMinutosUser(entrada, oldState)
        }
        return;
    }
    if (newState.channelId === CANAL_OBSERVADO) {
        tiemposTemp.set(newState.id, Date.now());
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
        await generarColorAleatorioRule(message)
    }

    if (message.content.toString().includes("!lolLastMatch"))
    {
        await mostrarResumenUltimaPartidaLOL(message)
    }

    if (message.content.toString() === "!ruterTilt")
    {
        await incrementRuterEnfado();

    }

    if (message.content.toString() === "!verRuterTilt")
    {
        await mostrarEnfadosRuter(message);
    }




    // Comandos de administrador
    if (message.author.id === ID_PROPIETARIO)
    {
        // Envia el fichero JSON de los tiempos AFK
        if (message.content.toString() === "!AFK")
        {
            await message.reply({content: "Reporte AFK", files: [tiemposAFK]});
        }
        if (message.content.toString() === "!RuterJSON")
        {
            await message.reply({content: "JSON de enfados Ruter", files: [ruterEnfado]});
        }

        // Borra todos sus mensajes
        if (message.content.toString() === "!limpiar")
        {
            await borrarMensajesBot(message)
        }

        //Borra todos los mensajes de un canal
        if (message.content.toString() === "!limpiarTodo")
        {
            await borrarMensajesCanal(message)
        }
    }


})

async function generarColorAleatorioRule(message) {
    const colores = ["Rojo", "Negro"];
    await message.reply(colores[Math.floor(Math.random() * (1 + 1))]);
}

async function borrarMensajesCanal(message) {
    const mensajes = await message.channel.messages.fetch( );
    mensajes.forEach(mensaje=> { mensaje.delete(); })
}

async function borrarMensajesBot(message) {
    const mensajes = await message.channel.messages.fetch( );
    mensajes.forEach(mensaje=> {
        if (mensaje.author.bot)
        {
            mensaje.delete();
        }
    })
}
async function mostrarResumenUltimaPartidaLOL(message)
{
    const user = message.content.toString().substring("!lolLastMatch".length + 1);
    const [username, tag] = user.split("#");
    await message.reply("Dejame analizar... :face_with_monocle: ")
    const vodReview = await lolUtility.todos(username, tag)
    await message.reply(vodReview.toString().substring(0, vodReview.toString().length / 2))
    await message.reply(vodReview.toString().substring(vodReview.toString().length / 2))
    if (username.includes(" "))
    {
        const modUsername = username.replace(" ", "%20")
        await message.reply(`Esta es mi trayectoria: https://op.gg/es/lol/summoners/euw/${modUsername}-${tag}`)
        return
    }
    await message.reply(`Esta es mi trayectoria: https://op.gg/es/lol/summoners/euw/${username}-${tag}`)
}

async function mostrarEnfadosRuter(message)
{
    const enfados = await verRuterEnfado();
    if (enfados === undefined)
    {
        await message.reply(`ByRuter lleva 0 enfados`);
        return
    }
    await message.reply(`ByRuter lleva ${enfados} enfados`);
}

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


    const datos = cargarDatos(tiemposAFK);
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

async function incrementRuterEnfado()
{
    const baseDatos = cargarDatos(ruterEnfado);
    if (!baseDatos["Enfados"])
    {
        baseDatos["Enfados"] = 0;
    }
    baseDatos["Enfados"] += 1
    guardarDatos(ruterEnfado, baseDatos)
}

async function verRuterEnfado()
{
    const baseDatos = cargarDatos(ruterEnfado);
    if (!baseDatos["Enfados"])
    {
        console.log("No hay enfados aun")
        return
    }
    console.log(`Enfados Totales: ${baseDatos["Enfados"]}`);
    return baseDatos["Enfados"]
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

