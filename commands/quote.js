const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { readServerChannels } = require('../readchannels.js');
const { embedColor } = require('../config.json');

async function randomQuote(userInteraction, isSlash) {
    let isFiltered = true;
    let filterUser;
    
    if (!isSlash) {
        let userMessage = userInteraction.content.split('?quote ')[1];
        if (userMessage != undefined) { //if we have parameters, like unfiltered or a user to search for 
            if (userMessage.includes('unfiltered')) {
                isFiltered = false;
            }

            let searchUser = userMessage.replace((/unfiltered\s?/g), ''); //deletes "unfiltered" even if we have a trailing space or not
            if (searchUser != undefined) { //if we have more than "unfiltered" in the message, indicating a user to search for
                let members = await userInteraction.guild.members.fetch();
                members.forEach(GuildMember => {
                    if (GuildMember.user.username == searchUser || GuildMember.user.globalName == searchUser || GuildMember.nickname == searchUser) {
                        filterUser = GuildMember.user.id;
                        console.log(GuildMember.user.id);
                    }
                });
                if (filterUser == undefined && userMessage != 'unfiltered') {
                    return userInteraction.channel.send('i-i couldnt find that user,, >_<;;');
                }
            }
        }
    } else {
        isFiltered = userInteraction.options.getBoolean('unfiltered') ?? true;
        try {
            filterUser = userInteraction.options.getUser('user').id;
        } catch {
            console.log('\x1b[33mno user was specified in the quote,, >_<;;\x1b[0m')
        }
    }

    let channelMessages = readServerChannels(userInteraction.guild.name, isFiltered, filterUser);
    let quoteMessage = channelMessages[Math.round(Math.random()*channelMessages.length)];

    try {
        if (quoteMessage.content.length == 0) { //assuming that there's an attachment, but no message
            quoteMessage.content = "(no message provided >_<)";
        } else if (quoteMessage.content.length > 255) {
            quoteMessage.content = quoteMessage.content.substring(0, 252)+'...';
        }
    } catch { //if that fails, then we know the quote message is undefined, so we can just set it right away~
        quoteMessage.content = "(no message provided >_<)";
    }

    let messageFields;
    if (isFiltered) {
        messageFields = [
            {name: '', value: `🔥 ${quoteMessage.fireReacts}`}, 
            {name: '', value: `sent by <@${quoteMessage.authorId}> • [${snowflakeToTimestamp(quoteMessage.id)}](https://discord.com/channels/${quoteMessage.guildId}/${quoteMessage.channelId}/${quoteMessage.id})`}
        ];  
    } else {
        messageFields = {name: '', value: `sent by <@${quoteMessage.authorId}> • [${snowflakeToTimestamp(quoteMessage.id)}](https://discord.com/channels/${quoteMessage.guildId}/${quoteMessage.channelId}/${quoteMessage.id})`};
        //don't include the fire reacts if we're unfiltered :p
    }

    let embedRegex = /https:\/\/(?:[\w.-]+\.)?(tenor\.com|s-ul\.eu)\/\S*/i; //tests for tenor.com or any s-ul.eu subdomain, just for now~
    //regex is scary.
    let embed = quoteMessage.attachmentUrl; //if there's an attachment in the image already, we'll use that~
    if (embedRegex.test(quoteMessage.content)) {
        embed = quoteMessage.content.match(embedRegex)[0];
        quoteMessage.content = quoteMessage.content.replace(embed, '');
        if (quoteMessage.content.length == 0) {
            quoteMessage.content = "(no message provided >_<)";
        } 
    }

    let quoteEmbed = new EmbedBuilder()
    .setTitle(quoteMessage.content)
    .setColor(embedColor)
    .addFields(messageFields)
    .setImage(embed)

    if (!isSlash) {
        return userInteraction.channel.send({ embeds: [quoteEmbed] });
    } else {
        return { embeds: [quoteEmbed] };
    }
}

function snowflakeToTimestamp(snowflakeId) {
    let unixTime = (BigInt(snowflakeId) >> 22n) + 1420070400000n;
    let timestamp = new Date(Number(unixTime));

    return `${timestamp.getUTCMonth()+1}/${timestamp.getUTCDate()}/${timestamp.getUTCFullYear()}`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quote')
        .setDescription('pulls a random quote from the current server~ >w<')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('takes a user to give a quote from in particular~'))
        .addBooleanOption(option =>
            option.setName('unfiltered')
                .setDescription('on by default, this adds messages without certain reacts O.o')),
    async execute(interaction) {
        let quote = await randomQuote(interaction, true);
        await interaction.reply(quote);
    },
    randomQuote
};