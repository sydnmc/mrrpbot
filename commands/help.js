const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { embedColor } = require('../config.json');

function helpMessage(channel, isSlash) {
    let helpEmbed = new EmbedBuilder()
    .setTitle('hihiii!! :D')
    .setThumbnail('https://cdn.discordapp.com/avatars/1340778139886031008/56508c96af2eb1afa323d3b87e3e7f1d') //bot pfp
    .setDescription('im sydneys bot that can help with various things >w<\nheres a list of all the commands that i have so far,,')
    .setColor(embedColor)
    .addFields(
        {name: '?help', value: 'displays this message!! :3 \nthese are all the commands i know >_<'},
        {name: '?front ``name``', value: 'displays whos fronting :3 \ncan accept a username, server nickname, or @ing someone'},
        {name: '?quote ``unfiltered`` ``name``', value: 'pulls a random quote from the current server~ >w<\n``unfiltered`` searches for messages with/without 🔥 reacts :3\n``name`` is the name of the person you want to quote~ >w<\nboth of these can be blank, tho~'},
        {name: '?remind ``time`` ``reminder``', value: 'reminds you of something whenever you want >:3\n``time`` takes any input you can think of for time :O\n``reminder`` is the message you want to be reminded of~'}
    )
    .setFooter({text: 'go follow my wife @catgirlflowers on twitter >_<;;'})
    
    let returnText = { embeds: [helpEmbed] }
    if (!isSlash) {
        return channel.send(returnText);
    } else {
        return returnText;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('lists all commands that i can use :3'),
    async execute(interaction) {
        await interaction.reply(helpMessage(interaction.channel, true));
    },
    helpMessage
};