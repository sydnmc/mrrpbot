const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
const dotenv = require('dotenv');

dotenv.config();

const defaultColour = process.env.EMBED_COLOUR ?? '#7D6D78';

async function getFronter(userId) {
    let res = await fetch(`https://api.pluralkit.me/v2/systems/${userId}/fronters`);
    fronter = await res.json();

    return fronter;
}

async function getSystem(systemId) {
    let res = await fetch(`https://api.pluralkit.me/v2/systems/${systemId}`);
    system = await res.json();

    return system;
}

async function frontHandler(userInteraction, isSlash) {
    let authorId;
    let searchUser;
    let curGuildInfo = userInteraction.client.guilds.resolve(userInteraction.guildId);
    
    if (isSlash) {
        authorId = userInteraction.user.id;
        searchUser = userInteraction.options.getString('user') ?? 'me';
    } else {
        authorId = userInteraction.author.id;
        searchUser = userInteraction.content.split('?front ')[1];
    }
    
    let userInQuestionId;
    if (searchUser == "me") {
        userInQuestionId = authorId;
    }
    if (searchUser != undefined && searchUser != "me") {
        let members = await curGuildInfo.members.fetch();
        members.forEach(GuildMember => {
            if (GuildMember.user.username == searchUser || GuildMember.user.globalName == searchUser) {
                userInQuestionId = GuildMember.user.id;
            }
        });
    } else if (searchUser != "me") {
        let undefinedUserMessage = "e-eh..? you didnt ask about anyone,.."
        if (!isSlash) {
            return userInteraction.channel.send(undefinedUserMessage);
        } else {
            return { content: undefinedUserMessage };
        }
    }

    if (userInQuestionId == undefined) { //if we can't find the user by searching, we'll look using their @
        try {
            userInQuestionId = searchUser.split('@')[1];
            userInQuestionId = userInQuestionId.substring(0, userInQuestionId.length-1);
        } catch {
            let unknownUserMessage = "w-who are you talking about,, >.< i couldnt find them,..\nmaybe they go by another name,..?";
            if (!isSlash) {
                return userInteraction.channel.send(unknownUserMessage);
            } else {
                return { content: unknownUserMessage };
            }
        }
    }

    let curFronter;
    let curSystem;
    try {
        curFronter = await getFronter(userInQuestionId);
        curSystem = await getSystem(curFronter.members[0].system);
    } catch {
        let pluralNotFoundMessage = "y-you don't seem to have pluralkit,, >_<;;"
        if (!isSlash) {
            return userInteraction.channel.send(pluralNotFoundMessage);
        } else {
            return { content: pluralNotFoundMessage };
        }
    }
    let description = 'theyve ';

    try {
        if (!curFronter.members[0].pronouns.startsWith("they")) {
            description = curFronter.members[0].pronouns.split('/')[0]+'s '; //uses member pronouns as well
        }
    } catch {
        try {
        //assuming that the system has pronouns instead, like with what i have
            if (!curSystem.pronouns.startsWith("they") && description == 'theyve ') {
                description = curSystem.pronouns.split('/')[0]+'s ';
            }
        } catch {
            console.log(`\x1b[33md-doesnt look like ${curFronter.members[0].name} has any pronouns,,. defaulting to they/them!! >_<;;\x1b[0m`);
        }
    }

    let timeSinceFront = Date.now() - Date.parse(curFronter.timestamp);
    let hoursSinceFront = Math.floor(timeSinceFront/(1000*60*60));
    let minutesSinceFront = Math.round(timeSinceFront/(1000*60) - hoursSinceFront*60);

    description = description + `been fronting since ${hoursSinceFront} hours, ${minutesSinceFront} minutes ago >w<`;

    let sidebarColor = defaultColour;

    try {
        sidebarColor = curFronter.members[0].color;
    } catch {
        console.log(`\x1b[33md-doesnt look like ${curFronter.members[0].name} has a color associated with them,, >_<;;\x1b[0m`);
    }

    let fronterEmbed = new EmbedBuilder()
        .setTitle(`${curFronter.members[0].name}!! :0 | ${curSystem.name}~`)
        .setThumbnail(curFronter.members[0].avatar_url)
        .setDescription(description)
        .setColor(sidebarColor)

    let returnMessage = {
        content:`looks like ${curFronter.members[0].name} is fronting for ${curSystem.name} right now,, >.<`,
        embeds: [fronterEmbed]
    };
    if (!isSlash) {
        return userInteraction.channel.send(returnMessage);
    } else {
        return returnMessage;
    }
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('front')
        .setDescription('shows the currently fronting alter for someone >w<')
        .addStringOption(option =>
            option.setName('user')
                .setDescription('whoever you want to check!! :3 defaults to yourself~')),
    async execute(interaction) {
        let response = await frontHandler(interaction, true); //i spent hours debugging this but it NEEDS to be in a variable. idk why.
        await interaction.reply(response);
    },
    frontHandler
};